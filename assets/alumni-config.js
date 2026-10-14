/* ===================================================================
   ALUMNI REGISTRATION — settings a staff member can edit without
   touching any other file. Save this file after editing and re-upload
   it; nothing else needs to change.
   =================================================================== */

window.ALUMNI_CONFIG = {

  // Where to pay the Ksh 200 registration fee, shown on the Alumni page.
  // Use the school fees Paybill, or a staff member's M-Pesa Till/number,
  // until the dedicated Alumni Paybill is ready — then just update these
  // two lines and nothing else changes.
  M_PESA_NUMBER: "0726 103 633",
  NAME_OF_RECIPIENT: "EMILY JUMA",     // what the payer should type as the Account/Reference

  // Where registrations are saved. This is the "Web app URL" you get after
  // deploying the Google Apps Script described in GOOGLE_SHEETS_SETUP.txt.
  // Registration will not work until this is filled in.
  SHEET_ENDPOINT_URL: "https://script.google.com/macros/s/AKfycbzSqDCVY4KrDE7MSuTL2oxv-GVO-8Qu95hU2mXN5d1A02NJcpRcrtpOYqWcX7wOhb2u/exec"

};
