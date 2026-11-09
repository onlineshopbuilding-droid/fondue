// Adjusts the Android project that `cap add android` generates: landscape only, no system bars.
// The generated project is not kept in the repo, so these changes live here.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_ID = 'io.github.onlineshopbuildingdroid.game';

const main = join('android', 'app', 'src', 'main');

const manifestPath = join(main, 'AndroidManifest.xml');
const manifest = readFileSync(manifestPath, 'utf8');
if (!/<activity\b/.test(manifest)) throw new Error('No <activity> found in AndroidManifest.xml');
if (!manifest.includes('android:screenOrientation')) {
  writeFileSync(manifestPath, manifest.replace(/<activity\b/, '<activity android:screenOrientation="sensorLandscape"'));
}

const activityPath = join(main, 'java', ...APP_ID.split('.'), 'MainActivity.java');
readFileSync(activityPath, 'utf8'); // fails loudly if the template moved
writeFileSync(activityPath, `package ${APP_ID};

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** Runs the game full screen; a swipe from the edge shows the system bars for a moment. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
console.log('Android project adjusted: landscape only, full screen.');
