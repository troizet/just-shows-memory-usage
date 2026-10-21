import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

Gio._promisify(Gio.File.prototype, 'load_contents_async', 'load_contents_finish');

export default class JustShowsMemoryExtension extends Extension {
    async _refresh() {
        let info = await this.read_proc_meminfo();
        if (!info || !this._label || !this._indicator) return;

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

    _startTimeout() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }

        this._timeout = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this._settings.get_uint('timeout'),
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    enable() {
        this._cancellable = new Gio.Cancellable();
        this._indicator = new PanelMenu.Button(0.0, "Just memory usage", false);
        this._settings = this.getSettings();
        this._digits = this._settings.get_uint('digits');
        this._displayMode = this._settings.get_uint('display-mode');

        Main.panel.addToStatusArea("Just memory usage Indicator", this._indicator);

        this._indicator.menu.addAction(_('Preferences'),
                () => this.openPreferences());

        this._digitsHandler = this._settings.connect('changed::digits', (settings, key) => {
            this._digits = settings.get_uint(key);
            this._refresh();
        });

        this._displayModeHandler = this._settings.connect('changed::display-mode', (settings, key) => {
            this._displayMode = settings.get_uint(key);
            this._refresh();
        });

        this._timeoutHandler = this._settings.connect('changed::timeout', () => {
            this._startTimeout();
        });

        this._label = new St.Label({
            text: 'Just memory usage',
            y_align: Clutter.ActorAlign.CENTER,
            track_hover: false,
            reactive: false
        });

        this._indicator.add_child(this._label);
        this._refresh();
        this._startTimeout();
    }

    disable() {
        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }

        this._label.destroy();
        this._label = null;
        this._indicator.destroy();
        this._indicator = null;

        if (this._digitsHandler) {
            this._settings.disconnect(this._digitsHandler);
            this._digitsHandler = null;
        }
        if (this._displayModeHandler) {
            this._settings.disconnect(this._displayModeHandler);
            this._displayModeHandler = null;
        }
        if (this._timeoutHandler) {
            this._settings.disconnect(this._timeoutHandler);
            this._timeoutHandler = null;
        }

        this._settings = null;
    }

    async read_proc_meminfo() {
        try {
            const file = Gio.File.new_for_path('/proc/meminfo');
            const [contents] = await file.load_contents_async(this._cancellable);
            const str = new TextDecoder().decode(contents);
            const lines = str.split('\n');

            let total = 0;
            let avail = 0;
            for (const line of lines) {
                if (line.startsWith('MemTotal:')) {
                    total = this.getMemInfo(line);
                } else if (line.startsWith('MemAvailable:')) {
                    avail = this.getMemInfo(line);
                }
                if (total > 0 && avail > 0)
                    break;
            }

            if (total === 0) {
                total = this.getMemInfo(lines[0]);
                avail = this.getMemInfo(lines[2]);
            }

            return {total: total, used: total - avail};
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                console.error(`${this.metadata?.name ?? 'JustShowsMemory'}: Error reading /proc/meminfo: ${e.message}`);
            return null;
        }
    }

    getMemInfo(str) {
        if (!str) return 0;
        let reg = /\d+/i;
        let s = str.match(reg);
        return s ? parseInt(s[0], 10) : 0;
    }
}
