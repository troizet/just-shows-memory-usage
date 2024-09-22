# just-shows-memory-usage
An extension for the `Gnome Shell` that simply shows memory usage.

The extension can be installed in the extension portal at the link:

https://extensions.gnome.org/extension/5877/just-shows-memory-usage/

Or you can install it from the source code following the instructions:
 - clone repository:
```
git clone https://github.com/troizet/just-shows-memory-usage.git
```
- package the extension code
```
gnome-extensions pack just-shows-memory-usage
```
where `just-shows-memory-usage` is the directory of the cloned repository

 - install the extension using the created archive
```
gnome-extensions install just_shows_memory_usage@troizet.github.com.shell-extension.zip
```

 - restart the `Gnome Shell` by logging out and logging in.

 - enable extension:
```
gnome-extensions enable just_shows_memory_usage@troizet.github.com
```
