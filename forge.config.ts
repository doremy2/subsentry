import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

/**
 * Code signing is opt-in via environment variables so unsigned local/CI builds
 * still work. See docs/DISTRIBUTION.md for how to obtain and configure them.
 */
const signMac = Boolean(process.env["APPLE_SIGNING_IDENTITY"]);
const notarizeMac = Boolean(process.env["APPLE_ID"] && process.env["APPLE_APP_SPECIFIC_PASSWORD"] && process.env["APPLE_TEAM_ID"]);

const config: ForgeConfig = {
  packagerConfig: {
    name: "SubSentry",
    executableName: "subsentry",
    appBundleId: "com.subsentry.app",
    icon: "assets/icons/icon", // Forge appends .icns / .ico
    asar: true,
    // Offline/proxied builds: point at a folder holding electron-v<version>-<platform>-<arch>.zip.
    ...(process.env["ELECTRON_ZIP_DIR"] && { electronZipDir: process.env["ELECTRON_ZIP_DIR"] }),
    extraResource: ["assets/tray"], // tray icons live outside the asar
    ...(signMac && {
      osxSign: { identity: process.env["APPLE_SIGNING_IDENTITY"] as string },
    }),
    ...(signMac && notarizeMac && {
      osxNotarize: {
        appleId: process.env["APPLE_ID"] as string,
        appleIdPassword: process.env["APPLE_APP_SPECIFIC_PASSWORD"] as string,
        teamId: process.env["APPLE_TEAM_ID"] as string,
      },
    }),
  },
  makers: [
    new MakerSquirrel({
      name: "SubSentry",
      setupIcon: "assets/icons/icon.ico",
      // Windows code signing: set WINDOWS_CERT_FILE / WINDOWS_CERT_PASSWORD (see docs/DISTRIBUTION.md).
      ...(process.env["WINDOWS_CERT_FILE"] && {
        certificateFile: process.env["WINDOWS_CERT_FILE"],
        certificatePassword: process.env["WINDOWS_CERT_PASSWORD"] ?? "",
      }),
    }),
    new MakerDMG({ name: "SubSentry", icon: "assets/icons/icon.icns", format: "ULFO" }, ["darwin"]),
    new MakerZIP({}, ["darwin", "win32"]),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: "electron/main/index.ts", config: "vite.main.config.mts", target: "main" },
        { entry: "electron/preload/preload.ts", config: "vite.preload.config.mts", target: "preload" },
      ],
      renderer: [{ name: "main_window", config: "vite.renderer.config.mts" }],
    }),
    // Harden the packaged Electron binary.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
