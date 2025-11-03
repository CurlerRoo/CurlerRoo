# workdir: ./src/assets
cd ./src/assets

IS_MACOS=$(uname -a | grep Darwin | wc -l)
IS_ARM64=$(uname -a | grep arm64 | wc -l)

if [ $IS_MACOS -eq 1 ]; then
  curl -L https://github.com/stunnel/static-curl/releases/download/8.16.0/curl-macos-x86_64-8.16.0.tar.xz -o curl-macos-x86_64-8.16.0.tar.xz
  mkdir -p curl-macos-x86_64-8.16.0
  tar -xvf curl-macos-x86_64-8.16.0.tar.xz -C curl-macos-x86_64-8.16.0
  rm -rf curl-macos-x86_64-8.16.0.tar.xz

  curl -L https://github.com/stunnel/static-curl/releases/download/8.16.0/curl-macos-arm64-8.16.0.tar.xz -o curl-macos-arm64-8.16.0.tar.xz
  mkdir -p curl-macos-arm64-8.16.0
  tar -xvf curl-macos-arm64-8.16.0.tar.xz -C curl-macos-arm64-8.16.0
  rm -rf curl-macos-arm64-8.16.0.tar.xz
else
  curl -L https://github.com/stunnel/static-curl/releases/download/8.16.0/curl-linux-x86_64-glibc-8.16.0.tar.xz -o curl-linux-x86_64-glibc-8.16.0.tar.xz
  mkdir -p curl-linux-x86_64-glibc-8.16.0
  tar -xvf curl-linux-x86_64-glibc-8.16.0.tar.xz -C curl-linux-x86_64-glibc-8.16.0
  rm -rf curl-linux-x86_64-glibc-8.16.0.tar.xz

  curl -L https://github.com/stunnel/static-curl/releases/download/8.16.0/curl-linux-aarch64-glibc-8.16.0.tar.xz -o curl-linux-aarch64-glibc-8.16.0.tar.xz
  mkdir -p curl-linux-aarch64-glibc-8.16.0
  tar -xvf curl-linux-aarch64-glibc-8.16.0.tar.xz -C curl-linux-aarch64-glibc-8.16.0
  rm -rf curl-linux-aarch64-glibc-8.16.0.tar.xz
fi
