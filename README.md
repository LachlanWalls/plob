# plob

plob is a simple(ish) SPA (single-page application) state manager, which handles page loading & url changing for you.

## Getting Started

Add the package via either NPM or a direct link in the `head` tag.

```sh
npm install plob
```

```js
const plob = require('plob')
```

CDN (or similar for local hosting):

```html
<script src="https://cdn.jsdelivr.net/npm/plob@latest/src/plob.min.js"></script>
```

Now, you can simply start plob with the following:

```js
plob.start()
```

This can be run at any time, but will wait for the DOM content to load before actually starting if it hasn't loaded already.

## Links

Any `a` tag with a path within the `root` path specifified in the options will automatically be overridden. Basically, you don't have to do anything.

## Options

The `plob.start(options)` function takes an object of options as input to configure plob's behaviour.

option | default | description
------ | ------- | -----------
root | '/' | root URL of the SPA system
containers | [document.body] | containers for page content to be rendered in
logging | false | enables logging
loadtimes | false | if logging is enabled, displays load times for pages
unsupported_cb | - | function to be run if plob is unsupported
trailing_slash | false | whether to go to `/foo/bar/` instead of `/foo/bar`
load_overlay | - | initial loading element to hide once first page is loaded

## Adding Pages

Pages take the form of **asynchronous functions** which have a 'render element' passed into them. They should then use this 'render element' (which will be one of the `containers` specific in options) as their root element in which the page is generated.

Pages can be added like so:

```js
function my_page(render_elm, plob_options) {
    const h2 = document.createElement('h2')
    h2.innerText = 'Hello, world!'

    const img = document.createElement('img')
    img.src = '/example/grumpy_cat.jpg'

    render_elm.appendChild(h2)
    render_elm.appendChild(img)
}

plob.pages.push({regex: '.*', loader: my_page})
```

The `page` object can also have a `name` and an `id` parameter, which serve no functional value within plob besides logging. A `priority` number (which defaults to `1`) can also be included, which will be used to sort the importance of pages when multiple regexs match for the current page. This is useful for pages such as 404.

### Page Object

key | type | example | description
--- | ---- | ------- | -----------
id | \*? | 'abcd123' | page ID. Not required for any plob functionality
name | \*? | 'abcd123' | page name. Not required for any plob functionality
regex | RegExp | '\/mypage.*' | regular expression to match the URLs this page applies to
loader | Function | - | function to run in order to load the page into a given element
priority | Number | 10 | relative priority compared to other pages

**Note: it is highly recommended to use an Asynchronous Function for the loader if the page relies on asynchrous code, otherwise it may appear before it has fully loaded.**

## 404 Page

A 404 page can easily be added with a wildcard regex and a negative priority, like so:

```js
plob.pages.push({regex: '.*', loader: el => el.innerText = 'page not found', priority: -1})
```

See `example/index.html` for a working example of this.
