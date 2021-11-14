# Vext

Simple VS Code Extension to toggle text features! With `vext` you can:
- Toggle a selection between a block comment, a line comment, and uncommented text
- Toggle a quoted string between `"`, `'`, and ``` ` ```

_TODO: Add video_

## Dependencies

Optionally, you may configure `vext` to auto-format when toggling comment type (see "Extension Settings"). Requires the installation of the [Rewrap Extension](https://marketplace.visualstudio.com/items?itemName=stkb.rewrap).

## Extension Settings

This extension contributes the following settings:

* `vext.autoFormatOnToggleCommentType`: Enable/disable auto-format (using `Rewrap`) when toggling comment type. Defaults to false.
* `vext.quoteChars`: Quote characters to be used when toggling quotes. Defaults to ```[", ', `]```.

## Development

See `launch.json` for configurations to run the extension or to run the test suite.

## Future Work
- Support default quote characters by language
- Support quotes that use a different opening/closing characters

## Known Issues

None