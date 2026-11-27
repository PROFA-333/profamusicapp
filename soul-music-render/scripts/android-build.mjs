// Builds the debug APK with the project-local JDK 17 and Android SDK in tools/.
// Usage: npm run android:build
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jdk = path.join(root, 'tools', 'jdk17');
const sdk = path.join(root, 'tools', 'android-sdk');
const gradleHome = path.join(root, 'tools', 'gradle-home');
const tmp = path.join(root, 'tools', 'tmp');

for (const [name, dir] of [['JDK 17', jdk], ['Android SDK', sdk]]) {
  if (!fs.existsSync(dir)) {
    console.error(`Missing ${name} at ${dir}. Install the toolchain into tools/ first.`);
    process.exit(1);
  }
}

for (const dir of [gradleHome, tmp]) fs.mkdirSync(dir, { recursive: true });

// Run the Gradle wrapper jar with the project JDK directly: the .bat script breaks
// on Windows paths containing spaces.
const java = path.join(jdk, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
const wrapperJar = path.join(root, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
const result = spawnSync(java, [
  '-Dorg.gradle.appname=gradlew',
  '-classpath', wrapperJar,
  'org.gradle.wrapper.GradleWrapperMain',
  'assembleDebug',
  '--console=plain',
], {
  cwd: path.join(root, 'android'),
  stdio: 'inherit',
  env: {
    ...process.env,
    JAVA_HOME: jdk,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    GRADLE_USER_HOME: gradleHome,
    TMPDIR: tmp,
    TEMP: tmp,
    TMP: tmp,
  },
});

if (result.status !== 0) process.exit(result.status ?? 1);

const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const out = path.join(root, 'SoulMusic-debug.apk');
fs.copyFileSync(apk, out);
console.log(`\nAPK ready: ${out}`);
