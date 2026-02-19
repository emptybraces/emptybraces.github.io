document.addEventListener("DOMContentLoaded", function () {

    /* ==============================
       🔧 調整可能パラメータ
    ============================== */

    const MOUSE_RADIUS = 80;
    const RECOVERY_RADIUS = 140;

    const BASE_MAX_INFECTION = 25;      // 基本最大感染
    const MAX_VARIATION = 5;           // 個体差

    const SPREAD_THRESHOLD = 3;
    const MOUSE_INCREASE = 2;
    const SPREAD_INCREASE = 1;

    const RECOVERY_SPEED = 1;
    const RECOVERY_DELAY = 1500;       // ← 感染後この時間で回復開始(ms)

    const TICK_RATE = 100;

    const ZALGO_CHARS = ["̷", "̸", "̶", "̴", "̵", "̹", "̺", "̻", "̼", "͜", "͝", "͞", "͟", "͠", "̾", "̿", "͗", "͘", "͙", "͚"];
    const CHAOS_CHARS = "▓▒░█▌▄▐▀■□◆◇※¤¶§≡±×÷≠∞";
    const HARD_GLITCH_THRESHOLD = 0.6;
    const FULL_GLITCH_THRESHOLD = 0.85;
    /* ============================== */

    function zalgoify(char, intensity) {
        let result = char;
        for (let i = 0; i < intensity; i++) {
            result += ZALGO_CHARS[Math.floor(Math.random() * ZALGO_CHARS.length)];
        }
        return result;
    }
    function corruptChar(original, infection, maxInfection) {

        const level = infection / maxInfection;

        if (level < 0.3) {
            return original;
        }

        if (level < HARD_GLITCH_THRESHOLD) {
            return zalgoify(original, 3);
        }

        if (level < FULL_GLITCH_THRESHOLD) {
            if (Math.random() < 0.4) {
                return CHAOS_CHARS[Math.floor(Math.random() * CHAOS_CHARS.length)];
            }
            return zalgoify(original, 2);
        }

        return CHAOS_CHARS[Math.floor(Math.random() * CHAOS_CHARS.length)];
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

                span.dataset.original = char;
                span.dataset.infection = "0";
                span.dataset.lastInfected = "0";

                // ★ 文字ごとの最大感染値をランダム化
                const randomMax =
                    BASE_MAX_INFECTION +
                    Math.floor(Math.random() * MAX_VARIATION);

                span.dataset.maxInfection = randomMax.toString();

                fragment.appendChild(span);
            }

            node.replaceWith(fragment);

        } else {
            node.childNodes.forEach(wrapText);
        }
    }

    wrapText(document.body);

    const letters = Array.from(document.querySelectorAll(".infect-letter"));
    const letterCount = letters.length;

    let mouseX = -9999;
    let mouseY = -9999;

    document.addEventListener("mousemove", function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener("mouseleave", function () {
        mouseX = -9999;
        mouseY = -9999;
    });
    // const rectCache = letters.map(l => l.getBoundingClientRect());
    /* ==============================
       メインループ
    ============================== */

    setInterval(function () {

        const now = performance.now();

        for (let i = 0; i < letterCount; i++) {

            const letter = letters[i];
            const original = letter.dataset.original;

            if (!original || original.trim() === "") continue;

            let infection = +letter.dataset.infection;
            const previous = infection;
            const maxInfection = +letter.dataset.maxInfection;

            const rect = letter.getBoundingClientRect();
            const dx = rect.left - mouseX;
            const dy = rect.top - mouseY;
            const distanceSq = dx * dx + dy * dy;

            /* ---- マウス感染 ---- */

            if (distanceSq < MOUSE_RADIUS * MOUSE_RADIUS) {
                infection += MOUSE_INCREASE;
                letter.dataset.lastInfected = now.toString();
            }

            /* ---- 伝播 ---- */
            const last = +letter.dataset.lastInfected;
            const canSpread = (now - last) < RECOVERY_DELAY;

            if (infection < maxInfection && canSpread) {

                const left = i > 0 ? +letters[i - 1].dataset.infection : 0;
                const right = i < letterCount - 1 ? +letters[i + 1].dataset.infection : 0;

                if (left >= SPREAD_THRESHOLD) infection += SPREAD_INCREASE;
                if (right >= SPREAD_THRESHOLD) infection += SPREAD_INCREASE;

                if (infection > previous) {
                    letter.dataset.lastInfected = now.toString();
                }
            }

            /* ---- 時間ベース回復 ---- */


            if (infection > 0 &&
                now - last > RECOVERY_DELAY &&
                distanceSq > RECOVERY_RADIUS * RECOVERY_RADIUS) {

                infection -= RECOVERY_SPEED;
            }

            /* ---- clamp ---- */

            if (infection < 0) infection = 0;
            if (infection > maxInfection) infection = maxInfection;

            letter.dataset.infection = infection;

            /* ---- 再描画 ---- */

            if (infection !== previous) {

                if (infection === 0) {
                    letter.textContent = original;
                } else {
                    letter.textContent = corruptChar(original, infection, maxInfection);
                }
            }
        }

    }, TICK_RATE);

    /* ==============================
       📼 感染型VHS崩壊（保持＋回復）
    ============================== */

    const IMAGE_MAX_INFECTION = 100;
    const IMAGE_INCREASE = 20;
    const IMAGE_RECOVERY_DELAY = 1500;
    const IMAGE_RECOVERY_SPEED = 1;
    const IMAGE_TICK_RATE = 120;

    const images = Array.from(document.querySelectorAll("img"));

    images.forEach(img => {

        const wrapper = document.createElement("div");
        wrapper.className = "glitch-wrapper";

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        img.dataset.infection = "0";
        img.dataset.lastInfected = "0";
        img.dataset.flip = "0";

        wrapper.addEventListener("mouseenter", () => {
            img.dataset.infection =
                Math.min(
                    IMAGE_MAX_INFECTION,
                    +img.dataset.infection + IMAGE_INCREASE
                );
            img.dataset.lastInfected = performance.now().toString();
        });

    });


    setInterval(() => {

        const now = performance.now();
        const t = now;

        images.forEach(img => {

            let infection = +img.dataset.infection;
            const last = +img.dataset.lastInfected;
            const wrapper = img.parentElement;

            if (infection > 0) {

                const level = infection / IMAGE_MAX_INFECTION;

                /* ======================
                   基本VHS崩壊（強さ依存）
                ====================== */

                img.style.transform =
                    `translateX(${(Math.random() - 0.5) * 40 * level}px)
                 skewX(${(Math.random() - 0.5) * 4 * level}deg)`;

                img.style.filter =
                    `contrast(${100 + level * 150}%)
                 brightness(${100 - level * 30}%)
                 hue-rotate(${Math.sin(t / 100) * 60 * level}deg)`;


                /* ======================
                   横帯スライス
                ====================== */

                const sliceCount = Math.floor(3 + level * 6);

                for (let i = 0; i < sliceCount; i++) {

                    const top = Math.random() * 100;
                    const height = 3 + Math.random() * 20;
                    const offset = (Math.random() - 0.5) * 120 * level;

                    const useNoise = Math.random() < 0.4;

                    let slice;

                    if (useNoise) {

                        slice = document.createElement("div");

                        slice.style.position = "absolute";
                        slice.style.left = "0";
                        slice.style.width = "100%";
                        slice.style.height = height + "%";
                        slice.style.top = top + "%";

                        slice.style.backgroundImage = "url('/assets/img/noise.jpg')";
                        slice.style.backgroundSize = "cover";
                        slice.style.opacity = 0.6 + level * 0.4;

                        slice.style.transform =
                            `translateX(${offset}px)`;

                    } else {

                        slice = img.cloneNode(true);

                        slice.style.position = "absolute";
                        slice.style.left = "0";
                        slice.style.top = "0";
                        slice.style.width = "100%";
                        slice.style.height = "100%";
                        slice.style.pointerEvents = "none";

                        slice.style.clipPath =
                            `polygon(
                            0% ${top}%,
                            100% ${top}%,
                            100% ${top + height}%,
                            0% ${top + height}%
                        )`;

                        slice.style.transform =
                            `translateX(${offset}px)`;

                        slice.style.filter =
                            `brightness(${100 + level * 50}%)
                         contrast(${100 + level * 100}%)`;
                    }

                    slice.style.pointerEvents = "none";
                    wrapper.appendChild(slice);

                    setTimeout(() => slice.remove(), 120);
                }


                /* ======================
                   一瞬上下反転（感染度依存）
                ====================== */

                const flipChance = 0.02 + level * 0.08;

                if (Math.random() < flipChance && img.dataset.flip === "0") {

                    img.dataset.flip = "1";
                    img.style.transform += " scaleY(-1)";

                    setTimeout(() => {
                        img.dataset.flip = "0";
                    }, 80);
                }


                /* ======================
                   回復処理
                ====================== */

                if (now - last > IMAGE_RECOVERY_DELAY) {
                    infection -= IMAGE_RECOVERY_SPEED;
                }

                if (infection < 0) infection = 0;
                img.dataset.infection = infection;

                if (infection === 0) {
                    img.style.transform = "";
                    img.style.filter = "";
                }

            }

        });

    }, IMAGE_TICK_RATE);

    /* ==============================
   🌀 軽量 空間破壊レンズ
    ============================== */

    /* ---- 調整可能パラメータ ---- */

    const LENS_RADIUS = 140;          // レンズ半径
    const LENS_BLUR = 6;              // 最大ブラー
    const LENS_DISTORT = 10;          // ズレ強度
    const LENS_TICK = 80;             // 更新速度(ms)
    const LENS_RGB_SHIFT = 3;         // RGB分離強度

    /* ------------------------------ */

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

    document.addEventListener("mousemove", e => {
        lensMouseX = e.clientX;
        lensMouseY = e.clientY;
        lensActive = true;
    });

    document.addEventListener("mouseleave", () => {
        lensActive = false;
    });

    setInterval(() => {

        if (!lensActive) {
            lensLayer.style.backdropFilter = "none";
            lensLayer.style.webkitBackdropFilter = "none";
            return;
        }

        const dx = (Math.random() - 0.5) * LENS_DISTORT;
        const dy = (Math.random() - 0.5) * LENS_DISTORT;

        const blur = Math.random() * LENS_BLUR;
        const hue = (Math.random() - 0.5) * 60;

        lensLayer.style.backdropFilter =
            `
            blur(${blur}px)
            contrast(180%)
            brightness(85%)
            saturate(160%)
            hue-rotate(${hue}deg)
            `;
        lensLayer.style.webkitBackdropFilter =
            `blur(${blur}px)
         hue-rotate(${hue}deg)
         contrast(120%)`;

        lensLayer.style.maskImage =
            `radial-gradient(
        circle ${LENS_RADIUS}px at ${lensMouseX}px ${lensMouseY}px,
        rgba(0,0,0,0.9) 0%,
        rgba(0,0,0,0.7) 40%,
        rgba(0,0,0,0.3) 70%,
        transparent 100%
    )`;

    }, LENS_TICK);

});

