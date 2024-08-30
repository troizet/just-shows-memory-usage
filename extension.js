import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

var indicator, label, timeout;

export default class JustShowsMemoryExtension extends Extension {
   _refresh() {
      let info = this.read_proc_meminfo();
      let total = (info.total/(1024*1024)).toFixed(0) + "G";
      let used = (info.used/(1024*1024)).toFixed(0) + "G";

      label.set_text(used + '/' + total);
   }

   enable() {
      indicator = new PanelMenu.Button(0.0, "Just memory usage", false);

      timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
          this._refresh();
          return true;
      });
      Main.panel.addToStatusArea("Just memory usage Indicator", indicator);

      label = new St.Label({
        text: 'Just memory usage',
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'panel-button',
        track_hover: false,
        reactive: false
      });

      indicator.actor.add_child(label);
   }

   disable() {
      GLib.source_remove(timeout);
      indicator.destroy();
      indicator = null;
      label = null;
      timeout = null;
   }

   read_proc_meminfo() {
      let result = GLib.file_get_contents("/proc/meminfo");
      if (result[0]) {
        let str = new TextDecoder().decode(result[1]);
        let lines = str.split("\n");
        let total = this.getMemInfo(lines[0]);
        let avail = this.getMemInfo(lines[2]);

        GLib.free(result[1]);
        return {total: total, used: (total-avail)};
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
