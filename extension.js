import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const DEFAULT_LOW_MEMORY_COLOR = '#8b0000';

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
        this._updateBackground(100 - percentVal);
    }

    _updateBackground(freePercent) {
        if (this._lowMemoryAlert && freePercent < this._lowMemoryThreshold) {
            let color = COLOR_REGEX.test(this._lowMemoryColor) ? this._lowMemoryColor : DEFAULT_LOW_MEMORY_COLOR;
            this._indicator.set_style(`background-color: ${color};`);
            this._label.set_style(this._lowMemoryDarkText ? 'color: #000000;' : null);
        } else {
            this._indicator.set_style(null);
            this._label.set_style(null);
        }
    }

    enable() {
        this._indicator = new PanelMenu.Button(0.0, "Just memory usage", false);
        this._settings = this.getSettings();
        this._digits = this._settings.get_uint('digits');
        this._displayMode = this._settings.get_uint('display-mode');
        this._lowMemoryAlert = this._settings.get_boolean('low-memory-alert');
        this._lowMemoryThreshold = this._settings.get_uint('low-memory-threshold');
        this._lowMemoryColor = this._settings.get_string('low-memory-color').trim();
        this._lowMemoryDarkText = this._settings.get_boolean('low-memory-dark-text');

        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._settings.get_uint('timeout'), () => {
            this._refresh();
            return true;
        });
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

        this._lowMemoryAlertHandler = this._settings.connect('changed::low-memory-alert', (settings, key) => {
            this._lowMemoryAlert = settings.get_boolean(key);
            this._refresh();
        });

        this._lowMemoryThresholdHandler = this._settings.connect('changed::low-memory-threshold', (settings, key) => {
            this._lowMemoryThreshold = settings.get_uint(key);
            this._refresh();
        });

        this._lowMemoryColorHandler = this._settings.connect('changed::low-memory-color', (settings, key) => {
            this._lowMemoryColor = settings.get_string(key).trim();
            this._refresh();
        });

        this._lowMemoryDarkTextHandler = this._settings.connect('changed::low-memory-dark-text', (settings, key) => {
            this._lowMemoryDarkText = settings.get_boolean(key);
            this._refresh();
        });

        this._timeoutHandler = this._settings.connect('changed::timeout', (settings, key) => {
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

        if (this._digitsHandler) {
            this._settings.disconnect(this._digitsHandler);
            this._digitsHandler = null;
        }
        if (this._displayModeHandler) {
            this._settings.disconnect(this._displayModeHandler);
            this._displayModeHandler = null;
        }
        if (this._lowMemoryAlertHandler) {
            this._settings.disconnect(this._lowMemoryAlertHandler);
            this._lowMemoryAlertHandler = null;
        }
        if (this._lowMemoryThresholdHandler) {
            this._settings.disconnect(this._lowMemoryThresholdHandler);
            this._lowMemoryThresholdHandler = null;
        }
        if (this._lowMemoryColorHandler) {
            this._settings.disconnect(this._lowMemoryColorHandler);
            this._lowMemoryColorHandler = null;
        }
        if (this._lowMemoryDarkTextHandler) {
            this._settings.disconnect(this._lowMemoryDarkTextHandler);
            this._lowMemoryDarkTextHandler = null;
        }
        if (this._timeoutHandler) {
            this._settings.disconnect(this._timeoutHandler);
            this._timeoutHandler = null;
        }

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
