import say from 'say';
import path from 'path-extra';
import { exec } from 'child_process';
import open from 'open';
import { remote } from 'electron';
import Settings from '../Settings';

class Dictionary {
    lookup = async (word, callback) => {
        var appPath = remote.app.getAppPath();
        var exePath = path.join(appPath, 'etc', 'lookup', 'osx-lookup').replace('app.asar', 'app.asar.unpacked');
        exec(`"${exePath}" "${word}"`, (err, stdout, stderr) => {
            if (err) {
                console.log('not able to execute osx-dictionary:' + err);
                callback(null);
                return;
            }

            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);

            callback(stdout, stderr);

            /*
            var items = JSON.parse(stdout);
            items = items.filter(item=> item.definition);
            items.forEach(item => {
               item.definition = this.parseDefinition(item.definition)
            });
            callback(items);
            */
        });
    };

    parseDefinition(item) {
        var lines = item.split(/\s+(\d+|•)\s+/);
        console.log(lines);
        return lines;
    }

    showDicWindow = word => {
        if (Settings.getSettings(Settings.SKEY_EXT_DIC) == Settings.EXD_APPLE_DIC) {
            open(`dict://${word}`);
        } else if (Settings.getSettings(Settings.SKEY_EXT_DIC) == Settings.EXD_EUDIC) {
            open(`eudic://dict/${word}`);
        }
    };

    pronounce = (word, voice) => {
        say.stop();
        if (voice) {
            say.speak(word, voice);
        } else {
            var voiceFromSetttings = Settings.getSettings(Settings.SKEY_VOICE);
            if (voiceFromSetttings) {
                say.speak(word, voiceFromSetttings);
            } else if (voiceFromSetttings != 'Off') {
                say.speak(word);
            }
        }
    };

    pronounceDefault = word => {
        say.stop();
        say.speak(word);
    };
}

export default new Dictionary();
