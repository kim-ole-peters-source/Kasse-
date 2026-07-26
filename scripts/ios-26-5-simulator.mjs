import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2] === "run" ? "run" : "build";
const runtimeId = "com.apple.CoreSimulator.SimRuntime.iOS-26-5";
const bundleId = "de.kcpremium.peterskasse";
const derivedDataPath = "build/ios-26-5-simulator";
const appPath = join(
  derivedDataPath,
  "Build",
  "Products",
  "Debug-iphonesimulator",
  "App.app",
);

const preferredDevices = [
  "iPad Pro 13-inch (M5)",
  "iPad Pro 11-inch (M5)",
  "iPad Air 13-inch (M4)",
  "iPad Air 11-inch (M4)",
  "iPad (A16)",
  "iPhone 17 Pro",
  "iPhone 17",
];

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
}

function tryCommand(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function clearExtendedAttributes(paths) {
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const result = tryCommand("xattr", ["-cr", path]);
    if (result.status !== 0) {
      process.stderr.write(result.stderr || result.stdout);
      process.exit(result.status ?? 1);
    }
  }
}

const deviceJson = JSON.parse(
  runCommand("xcrun", ["simctl", "list", "devices", "available", "--json"]),
);
const runtimeDevices = deviceJson.devices?.[runtimeId] ?? [];

if (!runtimeDevices.length) {
  console.error(
    "Kein iOS 26.5 Simulator gefunden. Bitte in Xcode unter Settings > Platforms iOS 26.5 installieren.",
  );
  process.exit(1);
}

const selectedDevice =
  preferredDevices
    .map((name) => runtimeDevices.find((device) => device.name === name))
    .find(Boolean) ?? runtimeDevices[0];

console.log(
  `Nutze Simulator: ${selectedDevice.name} (${selectedDevice.udid}) mit iOS 26.5`,
);

if (selectedDevice.state !== "Booted") {
  const boot = tryCommand("xcrun", ["simctl", "boot", selectedDevice.udid]);
  if (boot.status !== 0 && !`${boot.stderr}${boot.stdout}`.includes("Unable to boot device in current state")) {
    process.stderr.write(boot.stderr || boot.stdout);
    process.exit(boot.status ?? 1);
  }
}

runCommand("xcrun", ["simctl", "bootstatus", selectedDevice.udid, "-b"], {
  stdio: "inherit",
});

clearExtendedAttributes([
  "native-fallback",
  "ios/App/App",
  "ios/App/CapApp-SPM",
]);

runCommand("xcodebuild", [
  "-project",
  "ios/App/App.xcodeproj",
  "-scheme",
  "App",
  "-configuration",
  "Debug",
  "-destination",
  `id=${selectedDevice.udid}`,
  "-derivedDataPath",
  derivedDataPath,
  "CODE_SIGNING_ALLOWED=NO",
  "clean",
  "build",
], { stdio: "inherit" });

if (existsSync(appPath)) {
  clearExtendedAttributes([appPath]);
}

if (mode === "run") {
  if (!existsSync(appPath)) {
    console.error(`Build erfolgreich, aber App-Bundle nicht gefunden: ${appPath}`);
    process.exit(1);
  }

  runCommand("open", ["-a", "Simulator"], { stdio: "inherit" });
  runCommand("xcrun", ["simctl", "install", selectedDevice.udid, appPath], {
    stdio: "inherit",
  });
  runCommand("xcrun", ["simctl", "launch", selectedDevice.udid, bundleId], {
    stdio: "inherit",
  });
}
