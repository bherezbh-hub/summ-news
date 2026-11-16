#!/bin/sh
# התקנת עמוד הנחיתה המצחיק על ראוטר OpenWrt / GL.iNet.
# הרצה על הראוטר (אחרי העתקת התיקייה, למשל עם scp):
#   sh install.sh "שם הרשת שיופיע בעמוד"
set -e

NAME="${1:-הוויפי של הבית}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ">> מתקין openNDS..."
if command -v apk >/dev/null 2>&1; then
	apk update && apk add opennds
else
	opkg update && opkg install opennds
fi

echo ">> מעתיק את ה-Theme..."
cp "$DIR/theme_funny_he.sh" /usr/lib/opennds/theme_funny_he.sh
chmod +x /usr/lib/opennds/theme_funny_he.sh

echo ">> מגדיר את openNDS..."
uci set opennds.setup.enabled='1'
uci set opennds.setup.login_option_enabled='3'
uci set opennds.setup.themespec_path='/usr/lib/opennds/theme_funny_he.sh'
uci set opennds.setup.gatewayname="$NAME"
uci commit opennds

/etc/init.d/opennds enable
/etc/init.d/opennds restart

echo ">> מוכן! התחבר/י לרשת מטלפון חדש כדי לראות את העמוד."
echo "   לביטול: /etc/init.d/opennds stop && /etc/init.d/opennds disable"
