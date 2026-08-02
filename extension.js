import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export default class JustShowsMemoryExtension extends Extension {
    _refresh() {
        let info = this.read_proc_meminfo();
        if (!info) return;

        let total = (info.total / (1024 * 1024)).toFixed(this._digits) + "G";
        let used = (info.used / (1024 * 1024)).toFixed(this._digits) + "G";
        let percentVal = (info.used / info.total) * 100;
        let percent = (this._digits === 0 ? percentVal.toFixed(0) : percentVal.toFixed(1)) + "%";

        let text = '';
        switch (this._displayMode) {
            case 0:
                text = `${used}/${total}`;
                break;
            case 1:
                text = `${used}/${total} (${percent})`;
                break;
            case 2:
                text = `${percent}`;
                break;
            case 3:
                text = `${used} (${percent})`;
                break;
            default:
                text = `${used}/${total}`;
                break;
        }

        this._label.set_text(text);
    }

    enable() {
        this._indicator = new PanelMenu.Button(0.0, "Just memory usage", false);
        this._settings = this.getSettings();
        this._digits = this._settings.get_uint('digits');
        this._displayMode = this._settings.get_uint('display-mode');

        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._settings.get_uint('timeout'), () => {
            this._refresh();
            return true;
        });
        Main.panel.addToStatusArea("Just memory usage Indicator", this._indicator);

        this._indicator.menu.addAction(_('Preferences'),
                () => this.openPreferences());

        this._settings.connect('changed::digits', (settings, key) => {
            this._digits = settings.get_uint(key);
            this._refresh();
        });

        this._settings.connect('changed::display-mode', (settings, key) => {
            this._displayMode = settings.get_uint(key);
            this._refresh();
        });

        this._settings.connect('changed::timeout', (settings, key) => {
            GLib.source_remove(this._timeout);

            this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, settings.get_uint(key), () => {
                this._refresh();
                return true;
            });
        });

        this._label = new St.Label({
            text: 'Just memory usage',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-button',
            track_hover: false,
            reactive: false
        });

        this._indicator.add_child(this._label);
        this._refresh();
    }

    disable() {
        GLib.source_remove(this._timeout);
        this._indicator.destroy();
        this._indicator = null;
        this._label.destroy();
        this._label = null;
        this._timeout = null;
        this._settings = null;
    }

    read_proc_meminfo() {
        let result = GLib.file_get_contents("/proc/meminfo");
        if (result[0]) {
            let str = new TextDecoder().decode(result[1]);
            let lines = str.split("\n");
            let total = this.getMemInfo(lines[0]);
            let avail = this.getMemInfo(lines[2]);

            GLib.free(result[1]);
            return {total: total, used: (total - avail)};
        } else {
            log(`${this.name}: Error to read /proc/meminfo`);
        }
    }

    getMemInfo(str) {
        let reg = /\d+/i;
        let s = str.match(reg);
        return parseInt(s[0]);
    }
}
