# Build Directory

The build directory is used to house all the build files and assets for your application. 

The structure is:

* bin - Output directory
* darwin - macOS specific files
* windows - Windows specific files

## Mac

The `darwin` directory holds files specific to Mac builds.
These may be customised and used as part of the build. To return these files to the default state, simply delete them
and
build with `wails build`.

The directory contains the following files:

- `Info.plist` - the main plist file used for Mac builds. It is used when building using `wails build`.
- `Info.dev.plist` - same as the main plist file but used when building using `wails dev`.

### Generating the macOS App Icon

To generate a macOS `.icns` icon from `appicon.png`:

```bash
# Create the iconset directory
mkdir -p appicon.iconset

# Generate all required sizes with sips
sips -z 16 16     appicon.png --out appicon.iconset/icon_16x16.png
sips -z 32 32     appicon.png --out appicon.iconset/icon_16x16@2x.png
sips -z 32 32     appicon.png --out appicon.iconset/icon_32x32.png
sips -z 64 64     appicon.png --out appicon.iconset/icon_32x32@2x.png
sips -z 128 128   appicon.png --out appicon.iconset/icon_128x128.png
sips -z 256 256   appicon.png --out appicon.iconset/icon_128x128@2x.png
sips -z 256 256   appicon.png --out appicon.iconset/icon_256x256.png
sips -z 512 512   appicon.png --out appicon.iconset/icon_256x256@2x.png
sips -z 512 512   appicon.png --out appicon.iconset/icon_512x512.png
sips -z 1024 1024 appicon.png --out appicon.iconset/icon_512x512@2x.png

# Convert the iconset to .icns
iconutil -c icns appicon.iconset -o appicon.icns
```

The resulting `appicon.icns` can be placed in the `darwin` directory for use by Wails.

## Windows

The `windows` directory contains the manifest and rc files used when building with `wails build`.
These may be customised for your application. To return these files to the default state, simply delete them and
build with `wails build`.

- `icon.ico` - The icon used for the application. This is used when building using `wails build`. If you wish to
  use a different icon, simply replace this file with your own. If it is missing, a new `icon.ico` file
  will be created using the `appicon.png` file in the build directory.
- `installer/*` - The files used to create the Windows installer. These are used when building using `wails build`.
- `info.json` - Application details used for Windows builds. The data here will be used by the Windows installer,
  as well as the application itself (right click the exe -> properties -> details)
- `wails.exe.manifest` - The main application manifest file.