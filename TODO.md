# nextgen simplyedit roadmap

next
- switch to Proxies instead of getter/setters for the databinding
- break simplyedit into smaller ES6 modules - low hanging fruit first

later
- turn the proxies into signals and use effects for rendering
- clean up so that separate concerns have separate ES6 modules, where now
this is not the case
- get rid of the default globalThis.editor, create editor instances with a
factory function instead, allow options set through that factory function

