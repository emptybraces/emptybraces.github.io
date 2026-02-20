document.addEventListener("DOMContentLoaded", function () {

    // 文字カオスエフェクト
    const MOUSE_RADIUS = 80;

    const BASE_MAX_INFECTION = 10;      // 基本最大感染
    const MAX_VARIATION = 5;           // 個体差

    const MOUSE_INCREASE = 2;

    const RECOVERY_SPEED = 1;
    const RECOVERY_DELAY = 1500;       // ← 感染後この時間で回復開始(ms)

    const TICK_RATE = 80;

    const ZALGO_CHARS = ["̷", "̸", "̶", "̴", "̵", "̹", "̺", "̻", "̼", "͜", "͝", "͞", "͟", "͠", "̾", "̿", "͗", "͘", "͙", "͚"];
    const CHAOS_CHARS =
        "▓▒░█▌▄▐▀■□◆◇※¤¶§≡±×÷≠∞" +
        "卐࿗۞₪" +
        "爨驫龘靐齉灩鑿饕鱻黷攣癲籟躑纛讖顳囈" +
        "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝﾞﾟ" +
        "ⷶⷷⷸⷹⷺⷻⷼⷽⷾⷿ" +
        "ꙮ꙯꙰꙱꙲꙳ꙴꙵ";
    const ORIGINAL_THRESHOLD = 0.1;
    const HARD_GLITCH_THRESHOLD = 0.6;
    const FULL_GLITCH_THRESHOLD = 0.85;
    /* ============================== */
    let randSeed = 123456;
    function FastRandom() {
        randSeed ^= randSeed << 13;
        randSeed ^= randSeed >> 17;
        randSeed ^= randSeed << 5;
        return (randSeed >>> 0) / 4294967296;
    }
    const ZALGO_POOL = [];
    const MAX_ZALGO_INTENSITY = 30;
    (function BuildZalgoPool() {
        for (let i = 0; i < MAX_ZALGO_INTENSITY; i++) {
            let str = "";
            const count = 5 + Math.floor(FastRandom() * 30);
            for (let j = 0; j < count; j++) {
                str += ZALGO_CHARS[
                    Math.floor(FastRandom() * ZALGO_CHARS.length)
                ];
            }

            ZALGO_POOL.push(str);
        }
    })();
    function zalgoify(char, intensity) {
        const index = intensity % ZALGO_POOL.length;
        return char + ZALGO_POOL[index];
    }
    function corruptChar(original, infection, maxInfection) {

        const level = infection / maxInfection;
        if (level < ORIGINAL_THRESHOLD)
            return original;
        if (level < HARD_GLITCH_THRESHOLD)
            return zalgoify(original, infection);
        if (FastRandom() < 0.6) {
            return CHAOS_CHARS[
                Math.floor(FastRandom() * CHAOS_CHARS.length)
            ];
        }
        return zalgoify(original, infection * 3);
    }
    function wrapText(node) {

        if (node.nodeType === Node.TEXT_NODE) {

            const text = node.textContent;
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < text.length; i++) {

                const char = text[i];
                const span = document.createElement("span");

                span.textContent = char;
                span.className = "infect-letter";

                // ★ 文字ごとの最大感染値をランダム化
                const randomMax =
                    BASE_MAX_INFECTION +
                    Math.floor(Math.random() * MAX_VARIATION);
                span._infection = 0;
                span._lastInfected = 0;
                span._maxInfection = randomMax;
                span._original = char;

                fragment.appendChild(span);
            }

            node.replaceWith(fragment);

        } else {
            node.childNodes.forEach(wrapText);
        }
    }

    wrapText(document.body);
    const activeLetters = new Set();
    const letters = Array.from(document.querySelectorAll(".infect-letter"));
    const letterCount = letters.length;
    let rectCache = [];
    function updateRectCache() {
        rectCache = letters.map(l => {
            const r = l.getBoundingClientRect();
            return {
                x: r.left + window.scrollX,
                y: r.top + window.scrollY
            };
        });
    }
    updateRectCache();
    window.addEventListener("resize", () => {
        updateRectCache();
        buildSpatialIndex();
    });

    let lineGroups = [];
    function buildSpatialIndex() {
        lineGroups = [];
        let currentLine = [];
        let lastTop = null;
        const threshold = 5;
        for (let i = 0; i < letters.length; i++) {
            const rect = rectCache[i];
            const top = rect.y;
            if (lastTop === null || Math.abs(top - lastTop) < threshold) {
                currentLine.push(i);
            } else {
                lineGroups.push(currentLine);
                currentLine = [i];
            }
            lastTop = top;
        }
        if (currentLine.length) {
            lineGroups.push(currentLine);
        }
    }
    buildSpatialIndex();
    document.addEventListener("pointermove", function (e) {
        const mx = e.pageX;
        const my = e.pageY;
        const radiusSq = MOUSE_RADIUS * MOUSE_RADIUS;
        lineGroups.forEach(group => {

            const firstRect = rectCache[group[0]];
            const dy = firstRect.y - my;

            if (dy * dy > radiusSq) return;

            group.forEach(index => {

                const rect = rectCache[index];
                const dx = rect.x - mx;
                const dy2 = rect.y - my;

                if (dx * dx + dy2 * dy2 < radiusSq) {

                    const letter = letters[index];

                    letter._infection += MOUSE_INCREASE;
                    letter._lastInfected = performance.now();
                    activeLetters.add(letter);
                }
            });
        });
    });

    // メインループ
    let lastUpdate = 0;
    function update(now) {

        if (now - lastUpdate >= TICK_RATE) {
            activeLetters.forEach(letter => {

                let infection = letter._infection;
                const previous = infection;
                const maxInfection = letter._maxInfection;
                const last = letter._lastInfected;

                if (infection > 0 && now - last > RECOVERY_DELAY) {
                    infection -= RECOVERY_SPEED;
                }

                if (infection < 0) infection = 0;
                if (infection > maxInfection) infection = maxInfection;

                letter._infection = infection;

                if (infection !== previous) {

                    if (infection === 0) {
                        letter.textContent = letter._original;
                        activeLetters.delete(letter);
                    } else {
                        letter.textContent = corruptChar(letter._original, infection, maxInfection);
                    }
                }
            });

            lastUpdate = now;
        }
        UpdateImages(now);
        UpdateLens(now);
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);

    // 画像VHSエフェクト
    const IMAGE_MAX_INFECTION = 100;
    const IMAGE_INCREASE = 20;
    const IMAGE_RECOVERY_DELAY = 1500;
    const IMAGE_RECOVERY_SPEED = 1;
    const IMAGE_LOGIC_INTERVAL = 100; // 以前の更新感に合わせる
    const MAX_SLICES = 12;            // 最大帯数（元の sliceCount の上限に合わせる）
    const images = Array.from(document.querySelectorAll("img"));
    const image_states = [];

    function CreateSliceElement(img, wrapper, isNoise) {

        const slice = document.createElement("div");
        slice.style.position = "absolute";
        slice.style.left = "0";
        slice.style.top = "0";
        slice.style.width = "100%";
        slice.style.height = "100%";
        slice.style.pointerEvents = "none";
        slice.style.display = "none";

        if (isNoise) {
            slice._isNoise = true;
            slice.style.backgroundImage = "url('/assets/img/noise.jpg')";
            slice.style.backgroundSize = "cover";
            slice.style.backgroundRepeat = "no-repeat";
        } else {
            slice._isNoise = false;
            slice.style.backgroundImage = `url('${img.currentSrc || img.src}')`;
            slice.style.backgroundSize = "cover";
            slice.style.backgroundRepeat = "no-repeat";
            slice.style.backgroundPosition = "center";
        }

        wrapper.appendChild(slice);
        return slice;
    }

    images.forEach(img => {

        const wrapper = document.createElement("div");
        wrapper.className = "glitch-wrapper";
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        const slices = [];
        for (let i = 0; i < MAX_SLICES; i++) {
            // 半分はノイズ、半分は画像
            const is_noise = (i % 2) === 0;
            slices.push(CreateSliceElement(img, wrapper, is_noise));
        }

        const state = {
            img,
            wrapper,
            infection: 0,
            last_infected: 0,
            flip_until: 0,
            slices,
            slice_cursor: 0,
            last_logic: 0,
        };

        wrapper.addEventListener("mouseenter", () => {
            state.infection = Math.min(IMAGE_MAX_INFECTION, state.infection + IMAGE_INCREASE);
            state.last_infected = performance.now();
        });

        image_states.push(state);
    });

    function ShowSlice(state, clip_top, clip_height, offset_px, level, base_transform) {

        const slice = state.slices[state.slice_cursor];

        state.slice_cursor = (state.slice_cursor + 1) % state.slices.length;

        if (!slice) return;

        slice.style.display = "block";

        slice.style.clipPath =
            `polygon(
            0% ${clip_top}%,
            100% ${clip_top}%,
            100% ${clip_top + clip_height}%,
            0% ${clip_top + clip_height}%
        )`;

        if (slice._isNoise) {
            slice.style.opacity = (0.6 + level * 0.4).toString();
            slice.style.transform = `${base_transform} translateX(${offset_px}px)`;
        } else {
            slice.style.opacity = "1";
            slice.style.transform = `translateX(${offset_px}px)`;
            slice.style.filter =
                `brightness(${100 + level * 50}%)
                contrast(${100 + level * 100}%)`;
        }

        slice._hide_at = performance.now() + 120;
    }
    function UpdateImageSlicesVisibility(now) {
        for (let s = 0; s < image_states.length; s++) {
            const state = image_states[s];
            const slices = state.slices;
            for (let i = 0; i < slices.length; i++) {
                const slice = slices[i];
                if (slice.style.display === "none") continue;
                if (slice._hide_at === undefined) continue;
                if (slice._hide_at < now) {
                    slice.style.display = "none";
                }
            }
        }
    }

    function UpdateImages(now) {

        // まず slice の消灯処理（軽い）
        UpdateImageSlicesVisibility(now);

        for (let s = 0; s < image_states.length; s++) {

            const state = image_states[s];
            if (state.infection === 0) continue;

            // ロジック間引き
            if (now - state.last_logic < IMAGE_LOGIC_INTERVAL) continue;
            state.last_logic = now;

            let infection = state.infection;
            const last = state.last_infected;

            const level = infection / IMAGE_MAX_INFECTION;
            const t = now;

            const rpx = (Math.random() * 10 - 0.5) * 40 * level;
            const rw = 1 + (Math.random() - 0.5) * 2.0 * level;

            const base_transform =
                `translateX(${rpx}px)
                skewX(${(Math.random() - 0.5) * 4 * level}deg)
                scaleX(${rw})`;

            state.img.style.transform = base_transform;

            state.img.style.filter =
                `contrast(${100 + level * 150}%)
                brightness(${100 - level * 30}%)
                hue-rotate(${Math.sin(t / 100) * 60 * level}deg)`;

            // 横帯（slice）
            const slice_count = Math.floor(3 + level * 6);
            const actual_count = Math.min(slice_count, MAX_SLICES);

            for (let i = 0; i < actual_count; i++) {

                const top = Math.random() * 100;
                const height = 3 + Math.random() * 20;
                const offset = (Math.random() - 0.5) * 120 * level;

                ShowSlice(state, top, height, offset, level, base_transform);
            }

            // 反転（時間で管理）
            const flip_chance = 0.15 + level * 0.3;
            if (Math.random() < flip_chance) {
                if (state.flip_until < now) {
                    state.flip_until = now + 80;
                }
            }

            if (now < state.flip_until) {
                // scaleY(-1) を付与（base_transformを維持）
                state.img.style.transform = `${base_transform} scaleY(-1)`;
            }

            // 回復
            if (IMAGE_RECOVERY_DELAY < (now - last)) {
                infection -= IMAGE_RECOVERY_SPEED;
            }

            if (infection < 0) infection = 0;
            state.infection = infection;

            if (infection === 0) {
                state.img.style.transform = "";
                state.img.style.filter = "";
                state.flip_until = 0;
            }
        }
    }

    // レンズエフェクト
    const LENS_RADIUS = 140;
    const LENS_BLUR = 6;
    const LENS_DISTORT = 10;
    const LENS_LOGIC_INTERVAL = 50;

    const lensLayer = document.createElement("div");

    lensLayer.style.position = "fixed";
    lensLayer.style.left = "0";
    lensLayer.style.top = "0";
    lensLayer.style.width = "100vw";
    lensLayer.style.height = "100vh";
    lensLayer.style.pointerEvents = "none";
    lensLayer.style.zIndex = "99999";
    lensLayer.style.backdropFilter = "none";
    lensLayer.style.webkitBackdropFilter = "none";

    document.body.appendChild(lensLayer);

    let lensMouseX = -9999;
    let lensMouseY = -9999;
    let lensActive = false;
    let lensDirty = false;
    let lensLastLogic = 0;

    document.addEventListener("mousemove", e => {
        lensMouseX = e.clientX;
        lensMouseY = e.clientY;
        lensActive = true;
        lensDirty = true;
    });

    document.addEventListener("mouseleave", () => {
        lensActive = false;
        lensDirty = true;
    });

    function UpdateLens(now) {

        if (!lensActive) {
            if (lensDirty) {
                lensLayer.style.backdropFilter = "none";
                lensLayer.style.webkitBackdropFilter = "none";
                lensLayer.style.maskImage = "none";
                lensDirty = false;
            }
            return;
        }

        // 間引き
        if (now - lensLastLogic < LENS_LOGIC_INTERVAL) return;
        lensLastLogic = now;

        const dx = (Math.random() - 0.5) * LENS_DISTORT;
        const dy = (Math.random() - 0.5) * LENS_DISTORT;

        const blur = Math.random() * LENS_BLUR;
        const hue = (Math.random() - 0.5) * 60;

        // dx,dy は「中心を微妙に揺らす」用途として反映（mask側に）
        const cx = lensMouseX + dx;
        const cy = lensMouseY + dy;

        lensLayer.style.backdropFilter = `blur(${blur}px) contrast(180%) brightness(85%) saturate(160%) hue-rotate(${hue}deg)`;
        lensLayer.style.webkitBackdropFilter = `blur(${blur}px) hue-rotate(${hue}deg) contrast(120%)`;

        lensLayer.style.maskImage =
            `radial-gradient(
            circle ${LENS_RADIUS}px at ${cx}px ${cy}px,
            rgba(0,0,0,0.9) 0%,
            rgba(0,0,0,0.7) 40%,
            rgba(0,0,0,0.3) 70%,
            transparent 100%
        )`;

        lensDirty = false;
    }
});

