"""
Scheduled Reports API
Backend for auto-generating and emailing PDF/Excel reports
"""

from datetime import datetime, timedelta
from typing import List, Optional
from dataclasses import dataclass
from enum import Enum
import sqlite3
import json
import os
from pathlib import Path

# Report formats
class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"

# Report frequencies
class ReportFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

@dataclass
class ScheduledReport:
    """Scheduled report configuration"""
    id: str
    name: str
    format: ReportFormat
    frequency: ReportFrequency
    email: str
    query: str
    active: bool = True
    created_at: Optional[datetime] = None
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "format": self.format.value,
            "frequency": self.frequency.value,
            "email": self.email,
            "query": self.query,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
        }

class ReportScheduler:
    """Manage scheduled reports"""
    
    def __init__(self, db_path: str = "databotics.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Initialize database table"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_reports (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                format TEXT NOT NULL,
                frequency TEXT NOT NULL,
                email TEXT NOT NULL,
                query TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_run TIMESTAMP,
                next_run TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    def create_report(self, report: ScheduledReport) -> ScheduledReport:
        """Create new scheduled report"""
        # Calculate next run time
        report.next_run = self.calculate_next_run(report.frequency)
        report.created_at = datetime.now()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO scheduled_reports 
            (id, name, format, frequency, email, query, active, created_at, next_run)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report.id,
            report.name,
            report.format.value,
            report.frequency.value,
            report.email,
            report.query,
            report.active,
            report.created_at,
            report.next_run,
        ))
        
        conn.commit()
        conn.close()
        
        return report
    
    def get_all_reports(self) -> List[ScheduledReport]:
        """Get all scheduled reports"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM scheduled_reports ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        reports = []
        for row in rows:
            reports.append(self._row_to_report(row))
        
        return reports
    
    def get_active_reports(self) -> List[ScheduledReport]:
        """Get only active reports due to run"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now()
        cursor.execute("""
            SELECT * FROM scheduled_reports 
            WHERE active = 1 AND (next_run <= ? OR next_run IS NULL)
        """, (now,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_report(row) for row in rows]
    
    def update_report(self, report_id: str, updates: dict) -> Optional[ScheduledReport]:
        """Update a scheduled report"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        allowed_fields = ["name", "format", "frequency", "email", "query", "active"]
        set_clause = ", ".join([f"{k} = ?" for k in updates.keys() if k in allowed_fields])
        values = [v for k, v in updates.items() if k in allowed_fields]
        values.append(report_id)
        
        cursor.execute(f"""
            UPDATE scheduled_reports 
            SET {set_clause}
            WHERE id = ?
        """, values)
        
        conn.commit()
        conn.close()
        
        return self.get_report(report_id)
    
    def delete_report(self, report_id: str) -> bool:
        """Delete a scheduled report"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM scheduled_reports WHERE id = ?", (report_id,))
        
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        
        return deleted
    
    def get_report(self, report_id: str) -> Optional[ScheduledReport]:
        """Get a single report by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM scheduled_reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_report(row)
        return None
    
    def mark_report_run(self, report_id: str):
        """Mark report as run and calculate next run time"""
        report = self.get_report(report_id)
        if not report:
            return
        
        now = datetime.now()
        next_run = self.calculate_next_run(report.frequency)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE scheduled_reports 
            SET last_run = ?, next_run = ?
            WHERE id = ?
        """, (now, next_run, report_id))
        
        conn.commit()
        conn.close()
    
    def calculate_next_run(self, frequency: ReportFrequency) -> datetime:
        """Calculate next run time based on frequency"""
        now = datetime.now()
        
        if frequency == ReportFrequency.DAILY:
            # Next day at 9:00 AM
            next_run = now + timedelta(days=1)
            return next_run.replace(hour=9, minute=0, second=0, microsecond=0)
        
        elif frequency == ReportFrequency.WEEKLY:
            # Next Monday at 9:00 AM
            days_until_monday = (7 - now.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            next_run = now + timedelta(days=days_until_monday)
            return next_run.replace(hour=9, minute=0, second=0, microsecond=0)
        
        elif frequency == ReportFrequency.MONTHLY:
            # 1st of next month at 9:00 AM
            if now.month == 12:
                next_run = now.replace(year=now.year + 1, month=1, day=1)
            else:
                next_run = now.replace(month=now.month + 1, day=1)
            return next_run.replace(hour=9, minute=0, second=0, microsecond=0)
        
        return now
    
    def _row_to_report(self, row) -> ScheduledReport:
        """Convert database row to ScheduledReport"""
        return ScheduledReport(
            id=row[0],
            name=row[1],
            format=ReportFormat(row[2]),
            frequency=ReportFrequency(row[3]),
            email=row[4],
            query=row[5],
            active=bool(row[6]),
            created_at=datetime.fromisoformat(row[7]) if row[7] else None,
            last_run=datetime.fromisoformat(row[8]) if row[8] else None,
            next_run=datetime.fromisoformat(row[9]) if row[9] else None,
        )


class ReportGenerator:
    """Generate PDF/Excel/CSV reports"""
    
    def __init__(self, db_connection_string: str):
        self.db_connection = db_connection_string
    
    def execute_query(self, query: str) -> List[dict]:
        """Execute SQL query and return results"""
        conn = sqlite3.connect(self.db_connection)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Convert to list of dicts
        results = [dict(row) for row in rows]
        
        conn.close()
        return results
    
    def generate_pdf(self, data: List[dict], title: str) -> bytes:
        """Generate PDF report from data"""
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
            from io import BytesIO
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            elements = []
            
            styles = getSampleStyleSheet()
            elements.append(Paragraph(title, styles['Heading1']))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
            elements.append(Spacer(1, 20))
            
            if data:
                # Create table
                headers = list(data[0].keys())
                table_data = [headers]
                for row in data[:100]:  # Limit to 100 rows
                    table_data.append([str(row.get(h, "")) for h in headers])
                
                table = Table(table_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ]))
                elements.append(table)
            else:
                elements.append(Paragraph("No data returned from query.", styles['Normal']))
            
            doc.build(elements)
            pdf = buffer.getvalue()
            buffer.close()
            
            return pdf
            
        except ImportError:
            # Fallback: generate simple text
            lines = [title, f"Generated: {datetime.now()}", "", "Data:"]
            for row in data[:20]:
                lines.append(str(row))
            return "\n".join(lines).encode()
    
    def generate_excel(self, data: List[dict], title: str) -> bytes:
        """Generate Excel report from data"""
        try:
            import pandas as pd
            from io import BytesIO
            
            df = pd.DataFrame(data)
            
            buffer = BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Report', index=False)
                
                # Add metadata sheet
                metadata = pd.DataFrame({
                    'Property': ['Title', 'Generated At', 'Rows'],
                    'Value': [title, datetime.now().isoformat(), len(data)]
                })
                metadata.to_excel(writer, sheet_name='Metadata', index=False)
            
            excel = buffer.getvalue()
            buffer.close()
            
            return excel
            
        except ImportError:
            # Fallback to CSV
            return self.generate_csv(data, title)
    
    def generate_csv(self, data: List[dict], title: str) -> bytes:
        """Generate CSV report from data"""
        import csv
        from io import StringIO
        
        if not data:
            return b"No data\n"
        
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return output.getvalue().encode('utf-8')
    
    def generate_report(self, report: ScheduledReport) -> tuple:
        """Generate report and return (filename, content_bytes)"""
        # Execute query
        data = self.execute_query(report.query)
        
        # Generate report based on format
        if report.format == ReportFormat.PDF:
            content = self.generate_pdf(data, report.name)
            filename = f"{report.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        elif report.format == ReportFormat.EXCEL:
            content = self.generate_excel(data, report.name)
            filename = f"{report.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        else:  # CSV
            content = self.generate_csv(data, report.name)
            filename = f"{report.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return filename, content


class EmailSender:
    """Send emails with report attachments"""
    
    def __init__(self, smtp_host: str = None, smtp_port: int = None,
                 username: str = None, password: str = None):
        self.smtp_host = smtp_host or os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
        self.username = username or os.getenv("SMTP_USERNAME")
        self.password = password or os.getenv("SMTP_PASSWORD")
    
    def send_report(self, to_email: str, report_name: str, 
                   filename: str, content: bytes) -> bool:
        """Send report via email"""
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            from email.mime.application import MIMEApplication
            
            msg = MIMEMultipart()
            msg['From'] = self.username
            msg['To'] = to_email
            msg['Subject'] = f"📊 {report_name} - {datetime.now().strftime('%Y-%m-%d')}"
            
            body = f"""
            Hello!
            
            Your scheduled report "{report_name}" is attached.
            
            Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            This is an automated email from Databotics.
            
            Best regards,
            Databotics Reporting System
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach report
            attachment = MIMEApplication(content)
            attachment.add_header('Content-Disposition', 'attachment', filename=filename)
            msg.attach(attachment)
            
            # Send email
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            print(f"Email send failed: {e}")
            return False


# Process due reports (run this in a cron job)
def process_due_reports():
    """Process all reports that are due to run"""
    scheduler = ReportScheduler()
    generator = ReportGenerator("databotics.db")
    email_sender = EmailSender()
    
    due_reports = scheduler.get_active_reports()
    
    print(f"Processing {len(due_reports)} due reports...")
    
    for report in due_reports:
        try:
            print(f"Generating: {report.name}")
            
            # Generate report
            filename, content = generator.generate_report(report)
            
            # Send email
            success = email_sender.send_report(
                report.email, 
                report.name, 
                filename, 
                content
            )
            
            if success:
                # Mark as run
                scheduler.mark_report_run(report.id)
                print(f"  ✅ Sent to {report.email}")
            else:
                print(f"  ❌ Failed to send")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    print("Done!")


if __name__ == "__main__":
    # Run manually
    process_due_reports()
