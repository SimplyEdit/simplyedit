# SimplyEdit
## The first CMS designed for the decentralized web

More information at [SimplyEdit.io](https://simplyedit.io)

SimplyEdit makes it easy to add a CMS to any existing website or application. All you need is add one script tag and then add some attributes to make parts of your page editable.

```
<h1 data-simply-field="title">A title</h1>

<script src="/js/simply-edit.js" data-api-key="mykey"></script>
```

SimplyEdit will try to save the contents of the fields to a file called `/data/data.json` by default, but you can tell it to store and retrieve the contents from another folder or even another site altogether:

```
<script src="/simplyedit/simply-edit.js" data-api-key="mykey" data-simply-endpoint="https://example.com/"></script>
```

Read more at [SimplyEdit.io/for-developers/](https://simplyedit.io/for-developers/)

## Installation

First clone this repository.

```
cd {document root}/
git clone https://github.com/simplyedit/simplyedit.git
```

Then add a symlink to mimic a license key.
```
 cd {document root}/simplyedit/
 ln -s . mykey
```

If you want to use simplyedit on multiple domains, you must make sure that you set the Access-Control-Allow-Origin header. For Apache this can generally be done by adding a `.htaccess` file, like this:

```
cd {document root}/simplyedit/
cat 'Header set Access-Control-Allow-Origin "*"' > .htaccess
```
