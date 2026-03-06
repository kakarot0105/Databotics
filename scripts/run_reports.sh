#!/bin/bash
# Cron job to run scheduled reports
# Add to crontab: 0 9 * * * /Users/bulmanik/clawd/databotics/scripts/run_reports.sh

LOG_FILE="/Users/bulmanik/clawd/databotics/logs/reports_cron.log"
mkdir -p $(dirname $LOG_FILE)

echo "========================================" >> $LOG_FILE
echo "Running scheduled reports: $(date)" >> $LOG_FILE
echo "========================================" >> $LOG_FILE

cd /Users/bulmanik/clawd/databotics/backend
source ../.venv/bin/activate 2>/dev/null || source ../../.venv/bin/activate 2>/dev/null

python -c "
from api.reports_scheduler import process_due_reports
process_due_reports()
" >> $LOG_FILE 2>&1

echo "" >> $LOG_FILE
