
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let link;
    	let t0;
    	let div4;
    	let div3;
    	let div0;
    	let t2;
    	let div1;
    	let a0;
    	let span0;
    	let t4;
    	let t5;
    	let a1;
    	let span1;
    	let t7;
    	let t8;
    	let div2;
    	let input0;
    	let button0;
    	let span2;
    	let t10;
    	let div19;
    	let div7;
    	let div5;
    	let input1;
    	let button1;
    	let span3;
    	let t12;
    	let div6;
    	let t14;
    	let div18;
    	let div17;
    	let button2;
    	let t16;
    	let div16;
    	let div8;
    	let span4;
    	let t18;
    	let div9;
    	let span5;
    	let t20;
    	let div10;
    	let span6;
    	let t22;
    	let div11;
    	let span7;
    	let t24;
    	let div12;
    	let span8;
    	let t26;
    	let div13;
    	let span9;
    	let t28;
    	let div14;
    	let span10;
    	let t30;
    	let div15;
    	let span11;

    	const block = {
    		c: function create() {
    			main = element("main");
    			link = element("link");
    			t0 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Lucky Chant";
    			t2 = space();
    			div1 = element("div");
    			a0 = element("a");
    			span0 = element("span");
    			span0.textContent = "home";
    			t4 = text(" Home");
    			t5 = space();
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "contact_page";
    			t7 = text(" Contact Me");
    			t8 = space();
    			div2 = element("div");
    			input0 = element("input");
    			button0 = element("button");
    			span2 = element("span");
    			span2.textContent = "search";
    			t10 = space();
    			div19 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			input1 = element("input");
    			button1 = element("button");
    			span3 = element("span");
    			span3.textContent = "+";
    			t12 = space();
    			div6 = element("div");
    			div6.textContent = "Your Tasks will be shown here";
    			t14 = space();
    			div18 = element("div");
    			div17 = element("div");
    			button2 = element("button");
    			button2.textContent = "spin";
    			t16 = space();
    			div16 = element("div");
    			div8 = element("div");
    			span4 = element("span");
    			span4.textContent = "--";
    			t18 = space();
    			div9 = element("div");
    			span5 = element("span");
    			span5.textContent = "--";
    			t20 = space();
    			div10 = element("div");
    			span6 = element("span");
    			span6.textContent = "--";
    			t22 = space();
    			div11 = element("div");
    			span7 = element("span");
    			span7.textContent = "--";
    			t24 = space();
    			div12 = element("div");
    			span8 = element("span");
    			span8.textContent = "--";
    			t26 = space();
    			div13 = element("div");
    			span9 = element("span");
    			span9.textContent = "--";
    			t28 = space();
    			div14 = element("div");
    			span10 = element("span");
    			span10.textContent = "--";
    			t30 = space();
    			div15 = element("div");
    			span11 = element("span");
    			span11.textContent = "--";
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined");
    			attr_dev(link, "class", "svelte-1lf6ivr");
    			add_location(link, file, 4, 1, 11);
    			attr_dev(div0, "class", "heading svelte-1lf6ivr");
    			add_location(div0, file, 8, 2, 156);
    			attr_dev(span0, "class", "material-symbols-outlined svelte-1lf6ivr");
    			attr_dev(span0, "id", "home");
    			add_location(span0, file, 10, 37, 254);
    			attr_dev(a0, "href", "google.com");
    			attr_dev(a0, "class", "home svelte-1lf6ivr");
    			add_location(a0, file, 10, 3, 220);
    			attr_dev(span1, "class", "material-symbols-outlined svelte-1lf6ivr");
    			attr_dev(span1, "id", "contact");
    			add_location(span1, file, 13, 40, 367);
    			attr_dev(a1, "href", "google.com");
    			attr_dev(a1, "class", "contact svelte-1lf6ivr");
    			add_location(a1, file, 13, 3, 330);
    			attr_dev(div1, "class", "icons svelte-1lf6ivr");
    			add_location(div1, file, 9, 2, 197);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Search..");
    			attr_dev(input0, "id", "search");
    			attr_dev(input0, "class", "svelte-1lf6ivr");
    			add_location(input0, file, 17, 22, 488);
    			attr_dev(span2, "class", "material-symbols-outlined svelte-1lf6ivr");
    			attr_dev(span2, "id", "srch");
    			add_location(span2, file, 17, 106, 572);
    			attr_dev(button0, "class", "search_button svelte-1lf6ivr");
    			add_location(button0, file, 17, 76, 542);
    			attr_dev(div2, "class", "search svelte-1lf6ivr");
    			add_location(div2, file, 17, 2, 468);
    			attr_dev(div3, "class", "header svelte-1lf6ivr");
    			add_location(div3, file, 7, 1, 133);
    			attr_dev(div4, "class", "pack svelte-1lf6ivr");
    			add_location(div4, file, 6, 1, 113);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Your Tasks..");
    			attr_dev(input1, "id", "task");
    			attr_dev(input1, "class", "svelte-1lf6ivr");
    			add_location(input1, file, 25, 20, 732);
    			attr_dev(span3, "id", "add");
    			attr_dev(span3, "class", "svelte-1lf6ivr");
    			add_location(span3, file, 25, 102, 814);
    			attr_dev(button1, "class", "add_tasks svelte-1lf6ivr");
    			add_location(button1, file, 25, 76, 788);
    			attr_dev(div5, "class", "task svelte-1lf6ivr");
    			add_location(div5, file, 25, 2, 714);
    			attr_dev(div6, "class", "task_list svelte-1lf6ivr");
    			add_location(div6, file, 28, 2, 860);
    			attr_dev(div7, "class", "list svelte-1lf6ivr");
    			add_location(div7, file, 24, 1, 693);
    			attr_dev(button2, "class", "spinBtn svelte-1lf6ivr");
    			add_location(button2, file, 32, 3, 979);
    			attr_dev(span4, "class", "svelte-1lf6ivr");
    			add_location(span4, file, 35, 5, 1099);
    			attr_dev(div8, "class", "number svelte-1lf6ivr");
    			set_style(div8, "--i", "1");
    			set_style(div8, "--clr", "#db7093");
    			add_location(div8, file, 34, 4, 1044);
    			attr_dev(span5, "class", "svelte-1lf6ivr");
    			add_location(span5, file, 38, 5, 1186);
    			attr_dev(div9, "class", "number svelte-1lf6ivr");
    			set_style(div9, "--i", "2");
    			set_style(div9, "--clr", "#20b2aa");
    			add_location(div9, file, 37, 4, 1131);
    			attr_dev(span6, "class", "svelte-1lf6ivr");
    			add_location(span6, file, 41, 5, 1273);
    			attr_dev(div10, "class", "number svelte-1lf6ivr");
    			set_style(div10, "--i", "3");
    			set_style(div10, "--clr", "#d63e92");
    			add_location(div10, file, 40, 4, 1218);
    			attr_dev(span7, "class", "svelte-1lf6ivr");
    			add_location(span7, file, 44, 5, 1360);
    			attr_dev(div11, "class", "number svelte-1lf6ivr");
    			set_style(div11, "--i", "4");
    			set_style(div11, "--clr", "#daa520");
    			add_location(div11, file, 43, 4, 1305);
    			attr_dev(span8, "class", "svelte-1lf6ivr");
    			add_location(span8, file, 47, 5, 1447);
    			attr_dev(div12, "class", "number svelte-1lf6ivr");
    			set_style(div12, "--i", "5");
    			set_style(div12, "--clr", "#ff340f");
    			add_location(div12, file, 46, 4, 1392);
    			attr_dev(span9, "class", "svelte-1lf6ivr");
    			add_location(span9, file, 50, 5, 1534);
    			attr_dev(div13, "class", "number svelte-1lf6ivr");
    			set_style(div13, "--i", "6");
    			set_style(div13, "--clr", "#ff7f50");
    			add_location(div13, file, 49, 4, 1479);
    			attr_dev(span10, "class", "svelte-1lf6ivr");
    			add_location(span10, file, 53, 5, 1621);
    			attr_dev(div14, "class", "number svelte-1lf6ivr");
    			set_style(div14, "--i", "7");
    			set_style(div14, "--clr", "#3cb371");
    			add_location(div14, file, 52, 4, 1566);
    			attr_dev(span11, "class", "svelte-1lf6ivr");
    			add_location(span11, file, 56, 5, 1708);
    			attr_dev(div15, "class", "number svelte-1lf6ivr");
    			set_style(div15, "--i", "8");
    			set_style(div15, "--clr", "#4169e1");
    			add_location(div15, file, 55, 4, 1653);
    			attr_dev(div16, "class", "wheel svelte-1lf6ivr");
    			add_location(div16, file, 33, 3, 1020);
    			attr_dev(div17, "class", "circle svelte-1lf6ivr");
    			add_location(div17, file, 31, 2, 955);
    			attr_dev(div18, "class", "silhouette svelte-1lf6ivr");
    			add_location(div18, file, 30, 1, 928);
    			attr_dev(div19, "class", "content svelte-1lf6ivr");
    			add_location(div19, file, 23, 0, 670);
    			attr_dev(main, "class", "svelte-1lf6ivr");
    			add_location(main, file, 3, 0, 3);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, link);
    			append_dev(main, t0);
    			append_dev(main, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div3, t2);
    			append_dev(div3, div1);
    			append_dev(div1, a0);
    			append_dev(a0, span0);
    			append_dev(a0, t4);
    			append_dev(div1, t5);
    			append_dev(div1, a1);
    			append_dev(a1, span1);
    			append_dev(a1, t7);
    			append_dev(div3, t8);
    			append_dev(div3, div2);
    			append_dev(div2, input0);
    			append_dev(div2, button0);
    			append_dev(button0, span2);
    			append_dev(main, t10);
    			append_dev(main, div19);
    			append_dev(div19, div7);
    			append_dev(div7, div5);
    			append_dev(div5, input1);
    			append_dev(div5, button1);
    			append_dev(button1, span3);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div19, t14);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, button2);
    			append_dev(div17, t16);
    			append_dev(div17, div16);
    			append_dev(div16, div8);
    			append_dev(div8, span4);
    			append_dev(div16, t18);
    			append_dev(div16, div9);
    			append_dev(div9, span5);
    			append_dev(div16, t20);
    			append_dev(div16, div10);
    			append_dev(div10, span6);
    			append_dev(div16, t22);
    			append_dev(div16, div11);
    			append_dev(div11, span7);
    			append_dev(div16, t24);
    			append_dev(div16, div12);
    			append_dev(div12, span8);
    			append_dev(div16, t26);
    			append_dev(div16, div13);
    			append_dev(div13, span9);
    			append_dev(div16, t28);
    			append_dev(div16, div14);
    			append_dev(div14, span10);
    			append_dev(div16, t30);
    			append_dev(div16, div15);
    			append_dev(div15, span11);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let wheel = document.querySelector(".wheel");
    	let spinBtn = document.querySelector(".spinBtn");

    	spinBtn.onclick = function () {
    		let value = Math.ceil(Math.random() * 3600);
    		wheel.style.transform = "rotate(" + value + " deg)";
    	};

    	value = Math.ceil(Math.random() * 3600);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ wheel, spinBtn });

    	$$self.$inject_state = $$props => {
    		if ('wheel' in $$props) wheel = $$props.wheel;
    		if ('spinBtn' in $$props) spinBtn = $$props.spinBtn;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
