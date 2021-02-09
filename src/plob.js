const plob = {
    _sethref: url => history.pushState({}, document.title, url),
    _state: { cci: -1, lof: null, ready: false, starting: false },
    _validate: url => url.startsWith(plob.options.root),
    _clean: url => {
        while (!plob.options.trailing_slash && url.endsWith('/')) url = url.substring(0, url.length - 1)
        if (plob.options.trailing_slash && !url.endsWith('/')) url = url + '/'
        return url
    },
    _oor: () => plob.log('error', 'current url out of range', '#f90404'),
    log: (name, info, evtcol = '#b35bf7') => {
        console.log(`%c[plob:%c${name}%c]%c >>%c`, `color: #b35bf7`, `color: ${evtcol}`, `color: #b35bf7`, 'color: #636363', 'color: inherit', info)
    },
    pages: [],
    _allcontainers: [],
    options: {},
    start: options => {
        document.addEventListener('readystatechange', () => plob._start(options))
        plob._start(options)
    },
    _start: options => {

        if (document.readyState === 'loading' || plob._state.starting) return
        plob._state.starting = true

        const default_options = {
            root: '/',
            containers: [],
            logging: false,
            loadtimes: false,
            unsupported_cb: null,
            trailing_slash: false,
            load_overlay: null
        }
    
        plob.options = Object.assign(default_options, options)

    
        // option parsing
        while (plob.options.root.endsWith('/')) plob.options.root = plob.options.root.substring(0, plob.options.root.length - 1)
        if (!plob.options.root.startsWith('/')) plob.options.root = '/' + plob.options.root
    
        // browser support checking
        if (window.onpopstate === undefined || !history.pushState) {
            return plob.log('error', 'browser not supported by plob, please make an issue on github c:', '#f90404')
        }
    
        // container checking
        if (!(plob.options.containers instanceof Array)) plob.options.containers = [plob.options.containers]
        plob.options.containers = plob.options.containers.map(container => {
            if (container instanceof Node) return container
            try {
                const elm = document.querySelector(container)
                if (elm) return elm
                else return null
            } catch(e) {
                return null
            }
        }).filter(container => container)
        if (plob.options.containers.length === 0) {
            plob.options.containers.push(document.body)
            plob.log('warning', 'no containers specified, using document.body. It is highly recommended you explicitly set this value.', '#f9960c')
        }

        // load overlay checking
        if (typeof(plob.options.load_overlay) === 'string') {
            try {
                const elm = document.querySelector(plob.options.load_overlay)
                if (!elm) plob._state.lof = 'unknown'
                else plob.options.load_overlay = elm
            } catch(e) {
                plob._state.lof = 'invalid'
            }
        }
        if (!(plob.options.load_overlay instanceof Node) && plob.options.logging && plob.options.load_overlay !== null) {
            if (plob._state.lof === 'unknown') plob.log('warning', '`load_overlay` no element found with selector `' + plob.options.load_overlay + '`', '#f9960c')
            else if (plob._state.lof === 'invalid') plob.log('warning', '`load_overlay` invalid selector `' + plob.options.load_overlay + '`', '#f9960c')
            else plob.log('warning', '`load_overlay` invalid value `' + plob.options.load_overlay + '`', '#f9960c')
        }
    
        // check current url
        if (!plob._validate(location.pathname)) return plob._oor()
        const cur_url = plob._clean(location.pathname)
        if (location.pathname !== cur_url) plob._sethref(cur_url)
    
        // override links
        plob._override()

        // listeners
        window.addEventListener('popstate', () => {
            if (plob._state.ready) {
                let url = location.pathname
                if (!plob._validate(url)) return plob._oor()
                plob.go(url)
            }
        })

        // startup logging
        if (plob.options.logging) {
            plob.log('started', plob.options, '#07ffd9')
            window.addEventListener('plob:url_changed', e => plob.log('url_changed', e.detail, '#078bff'))
            const strpgld = dt => (dt.id || dt.name || dt.regex) + (dt.time ? ` (${dt.time}ms)`:'')
            window.addEventListener('plob:page_load_start', e => plob.log('page_load_start', strpgld(e.detail), '#0cf914'))
            window.addEventListener('plob:page_load_complete', e => plob.log('page_load_complete', strpgld(e.detail), '#039b08'))
        }

        plob._state.ready = true

        plob.load()

        return true
    },
    _override: () => {
        document.querySelectorAll('a:not(.plob-ignore):not([plob-ignore]):not(.plob-upgraded)').forEach(a_elm => {
            let href = plob._clean(a_elm.href.replace(location.origin, ''))
            a_elm.href = href
    
            if (!plob._validate(href.replace(location.origin, ''))) return
    
            a_elm.addEventListener('click', e => {

                e.preventDefault()
                
                if (e.metaKey) {
                    window.open(a_elm.href, '_blank')
                    return
                }
    
                let nhref = a_elm.href.replace(location.origin, '')
                if (!plob._validate(nhref)) {
                    console.error('plob: invalid link clicked.')
                    return false
                }
    
                plob.go(nhref, true)
    
                return false
            })

            a_elm.classList.add('plob-upgraded')
        })
    },
    load: async() => {
        if (!plob._validate(location.pathname)) return plob._oor()
        const cur_url = plob._clean(location.pathname)
        if (location.pathname !== cur_url) plob._sethref(cur_url)

        const pages = plob.pages.sort((a, b) => (b.priority || 1) - (a.priority || 1))
        const page = pages.find(pg => cur_url.match(pg.regex))
        if (!page) return console.error('plob: no page found')

        let pd = {}
        if (page.name) pd.name = page.name
        if (page.id) pd.id = page.id
        if (!page.name && !page.id) pd.regex = page.regex

        window.dispatchEvent(new CustomEvent('plob:page_load_start', { detail: pd }))

        let container;
        let ncci = plob._state.cci + 1
        if (ncci > plob.options.containers.length - 1) ncci = 0

        if (typeof page.container === 'string') page.container = document.querySelector(page.container)
        if (page.container instanceof Node) container = page.container
        else container = plob.options.containers[ncci]

        if (!plob._allcontainers.includes(container)) plob._allcontainers.push(container)
        if (plob.containers.includes(container)) container.innerHTML = ''

        const ploads = performance.now()
        const res = await page.loader(container, plob.options)
        const lt = Math.round((performance.now() - ploads) * 1000) / 1000

        plob._allcontainers.forEach(cont => cont.style.display = (cont === container) ? '':'none')
        if (!(page.container instanceof Node)) plob._state.cci = ncci

        if (plob.options.load_overlay instanceof Node) plob.options.load_overlay.style.display = 'none'

        if (plob.options.loadtimes) pd.time = lt
        window.dispatchEvent(new CustomEvent('plob:page_load_complete', { detail: pd }))
    },
    go: (url, sh = false) => {
        if (sh) plob._sethref(url)
        window.dispatchEvent(new CustomEvent('plob:url_changed', { detail: url }))
        plob.load()
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = plob
} else {
    window.plob = plob
}