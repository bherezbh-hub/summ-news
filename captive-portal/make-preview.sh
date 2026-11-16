#!/bin/bash
# מייצר preview.html מתוך קובץ ה-Theme, כדי לראות את העמוד בדפדפן בלי ראוטר.
cd "$(dirname "$0")"
(
  gatewayname="הוויפי של הבית"; gatewayurl="#"; fas="preview"
  . ./theme_funny_he.sh
  header; continue_form; footer
) | sed 's#action="/opennds_preauth/"#action="javascript:alert(\x27במצב אמיתי כאן תקבל/י אינטרנט 🎉\x27)"#' > preview.html
echo "נוצר: $(pwd)/preview.html"
