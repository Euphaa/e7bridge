if [ ! -f "config.json" ]; then
  echo "config doesn't exist; creating..."
  cp "example-config.json" "config.json"
  echo "file created. please input your information into config.json before starting again."
  exit 0
fi

while true; do
  node --trace-exit src/Main.js
  echo "something happened... restarting in 10 seconds, press Ctrl + C to cancel"
  sleep 10
done