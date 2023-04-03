const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;

var indicator, label, timeout;

function _refresh() {
  let info = read_proc_meminfo();
  let total = (info.total/(1024*1024)).toFixed(2) + "G";
  let used = (info.used/(1024*1024)).toFixed(2) + "G";

  label.set_text(used + '/' + total);
}

function enable() {
      indicator = new PanelMenu.Button(0.0, "Just memory usage", false);

      timeout = Mainloop.timeout_add(1000, function () {
          _refresh();
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

function disable() {
      indicator.destroy();
      Mainloop.source_remove(timeout);
}

function read_proc_meminfo() {
  let result = GLib.file_get_contents("/proc/meminfo");
  if(result[0]) {
    let str = ByteArray.toString(result[1]);
    let lines = str.split("\n");
    let total = getMemInfo(lines[0]);
    let avail = getMemInfo(lines[2]);

    GLib.free(result[1]);
    return {total: total, used: (total-avail)};
  } else {
    log(`${Me.metadata.name}: Error to read /proc/meminfo`);
  }
}

function getMemInfo(str) {
  let reg = /\d+/i;
  let s = str.match(reg);
  return parseInt(s[0]);
}
