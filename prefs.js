import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function rgbaToHex(rgba) {
    const toHex = value => Math.round(value * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgba.red)}${toHex(rgba.green)}${toHex(rgba.blue)}`;
}


export default class JustShowsMemoryPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup();
        page.add(group);

        const displayModeRow = new Adw.ComboRow({
            title: _('Display Format'),
            subtitle: _('Format used to show memory usage.'),
            model: new Gtk.StringList({
                strings: [
                    _('Used / Total (e.g. 4.20G/15.50G)'),
                    _('Used / Total (Percent) (e.g. 4.20G/15.50G (27%))'),
                    _('Percent only (e.g. 27%)'),
                    _('Used (Percent) (e.g. 4.20G (27%))')
                ]
            })
        });

        group.add(displayModeRow);

        const digitsSpin = new Adw.SpinRow({
            title: _('Digits'),
            subtitle: _('Number of displayed decimal digits.')
        });

        digitsSpin.set_adjustment(
            new Gtk.Adjustment({
                lower: 0,
                upper: 5,
                step_increment: 1
            })
        );

        group.add(digitsSpin);

        const timeoutSpin = new Adw.SpinRow({
            title: _('Timeout'),
            subtitle: _('Timeout setting (in milliseconds).')
        });

        timeoutSpin.set_adjustment(
            new Gtk.Adjustment({
                lower: 100,
                upper: 10000,
                step_increment: 100
            })
        );

        group.add(timeoutSpin);

        const lowMemoryGroup = new Adw.PreferencesGroup({
            title: _('Low Memory Alert')
        });
        page.add(lowMemoryGroup);

        const lowMemoryAlertRow = new Adw.SwitchRow({
            title: _('Highlight on Low Memory'),
            subtitle: _('Change the widget background when free memory is low.')
        });

        lowMemoryGroup.add(lowMemoryAlertRow);

        const lowMemoryThresholdSpin = new Adw.SpinRow({
            title: _('Threshold'),
            subtitle: _('Highlight when free memory is below this value (in percent).')
        });

        lowMemoryThresholdSpin.set_adjustment(
            new Gtk.Adjustment({
                lower: 1,
                upper: 99,
                step_increment: 1
            })
        );

        lowMemoryGroup.add(lowMemoryThresholdSpin);

        const lowMemoryColorButton = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog({with_alpha: false}),
            valign: Gtk.Align.CENTER
        });

        const lowMemoryColorRow = new Adw.ActionRow({
            title: _('Background Color'),
            subtitle: _('Widget background color when free memory is low.'),
            activatable_widget: lowMemoryColorButton
        });

        lowMemoryColorRow.add_suffix(lowMemoryColorButton);
        lowMemoryGroup.add(lowMemoryColorRow);

        const lowMemoryDarkTextRow = new Adw.SwitchRow({
            title: _('Dark Text'),
            subtitle: _('Use black text instead of white (for light background colors).')
        });

        lowMemoryGroup.add(lowMemoryDarkTextRow);

        window._settings = this.getSettings();

        const syncColorButton = () => {
            const rgba = new Gdk.RGBA();
            if (rgba.parse(window._settings.get_string('low-memory-color')) &&
                !rgba.equal(lowMemoryColorButton.get_rgba()))
                lowMemoryColorButton.set_rgba(rgba);
        };

        syncColorButton();

        const colorChangedHandler = window._settings.connect('changed::low-memory-color', syncColorButton);
        window.connect('close-request', () => {
            window._settings.disconnect(colorChangedHandler);
            return false;
        });

        lowMemoryColorButton.connect('notify::rgba', () => {
            const hex = rgbaToHex(lowMemoryColorButton.get_rgba());
            if (window._settings.get_string('low-memory-color') !== hex)
                window._settings.set_string('low-memory-color', hex);
        });

        window._settings.bind('display-mode', displayModeRow, 'selected',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('digits', digitsSpin, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('timeout', timeoutSpin, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('low-memory-alert', lowMemoryAlertRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('low-memory-threshold', lowMemoryThresholdSpin, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        lowMemoryAlertRow.bind_property('active', lowMemoryThresholdSpin, 'sensitive',
            GObject.BindingFlags.SYNC_CREATE);

        window._settings.bind('low-memory-dark-text', lowMemoryDarkTextRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        lowMemoryAlertRow.bind_property('active', lowMemoryColorRow, 'sensitive',
            GObject.BindingFlags.SYNC_CREATE);

        lowMemoryAlertRow.bind_property('active', lowMemoryDarkTextRow, 'sensitive',
            GObject.BindingFlags.SYNC_CREATE);
    }
}
