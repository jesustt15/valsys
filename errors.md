  └─ ƒ createUnifiedInspectionAction({"error":"Too small: expected string to have >=17 characters"}, {}) in 4ms lib/actions/inspection.ts
[browser] Uncaught Error: An unexpected response was received from the server.
    at NewInspectionPage (app\(dashboard)\inspections\new\page.tsx:38:7)
  36 |       </div>
  37 |
> 38 |       <UnifiedInspectionForm owners={owners} vehicles={vehicles} />
     |       ^
  39 |     </div>
  40 |   )
  41 | }
[browser] NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.
    at navigator.clipboard.writeText (chrome-extension://deakbjemijlmlcehdgejmdpekkceodmk/data/notify_clipboard_change.js:24:38) (file://C:/Users/Jesus/Documents/valsys/front/.next/dev/static/chunks/0prs_next_dist_compiled_next-devtools_index_10.lqmw.js:2101:1285)
