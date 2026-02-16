"use client";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function FileRequiredAlert() {
  return (
    <Alert>
      <AlertTitle>No file uploaded</AlertTitle>
      <AlertDescription>
        Upload a CSV or XLSX file on the Upload page before running this workflow.
      </AlertDescription>
    </Alert>
  );
}
