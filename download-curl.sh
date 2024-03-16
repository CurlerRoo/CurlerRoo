# workdir: ./src/assets
cd ./src/assets

IS_MACOS=$(uname -a | grep Darwin | wc -l)
IS_ARM64=$(uname -a | grep arm64 | wc -l)

if [ $IS_MACOS -eq 1 ]; then
  curl -L https://github.com/stunnel/static-curl/releases/download/8.5.0/curl-macos-amd64-8.5.0.tar.xz -o curl-macos-amd64-8.5.0.tar.xz
  mkdir -p curl-macos-amd64-8.5.0
  tar -xvf curl-macos-amd64-8.5.0.tar.xz -C curl-macos-amd64-8.5.0
  rm -rf curl-macos-amd64-8.5.0.tar.xz

  curl -L https://github.com/stunnel/static-curl/releases/download/8.5.0/curl-macos-arm64-8.5.0.tar.xz -o curl-macos-arm64-8.5.0.tar.xz
  mkdir -p curl-macos-arm64-8.5.0
  tar -xvf curl-macos-arm64-8.5.0.tar.xz -C curl-macos-arm64-8.5.0
  rm -rf curl-macos-arm64-8.5.0.tar.xz
else
  curl -L https://github.com/stunnel/static-curl/releases/download/8.5.0/curl-static-amd64-8.5.0.tar.xz -o curl-static-amd64-8.5.0.tar.xz
  mkdir -p curl-static-amd64-8.5.0
  tar -xvf curl-static-amd64-8.5.0.tar.xz -C curl-static-amd64-8.5.0
  rm -rf curl-static-amd64-8.5.0.tar.xz

  curl -L https://github.com/stunnel/static-curl/releases/download/8.5.0/curl-static-arm64-8.5.0.tar.xz -o curl-static-arm64-8.5.0.tar.xz
  mkdir -p curl-static-arm64-8.5.0
  tar -xvf curl-static-arm64-8.5.0.tar.xz -C curl-static-arm64-8.5.0
  rm -rf curl-static-arm64-8.5.0.tar.xz
fi
