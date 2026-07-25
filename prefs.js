import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


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

        window._settings = this.getSettings();

        window._settings.bind('display-mode', displayModeRow, 'selected',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('digits', digitsSpin, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('timeout', timeoutSpin, 'value',
            Gio.SettingsBindFlags.DEFAULT);
    }
}
