// Grava uma prévia do motion em WebP animado (relatorios/previa-motion.webp), forçando
// prefers-reduced-motion: no-preference. Útil quando o Windows está com "Efeitos de animação" desligado,
// caso em que o navegador pede movimento reduzido e o site, de propósito, não anima.
import puppeteer from 'puppeteer-core';
import * as cl from 'chrome-launcher';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/content.mjs';
import { startServer } from './serve.mjs';

const [W, H] = [1280, 800];
const s = await startServer(4177);
const b = await puppeteer.launch({ executablePath: cl.Launcher.getInstallations()[0], headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H });
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
const frames = [];
const shot = async () => frames.push(await sharp(await p.screenshot({ type: 'png', captureBeyondViewport: false })).resize({ width: 800 }).png().toBuffer());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await p.goto('http://localhost:4177/', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 26; i++) { await shot(); await sleep(60); }           // entrada do hero
const scrollTo = async (y, steps = 14) => { const y0 = await p.evaluate(() => scrollY); for (let i = 1; i <= steps; i++) { await p.evaluate((v) => window.scrollTo(0, v), y0 + ((y - y0) * i) / steps); await shot(); } };
const top = (sel) => p.evaluate((q) => document.querySelector(q).getBoundingClientRect().top + scrollY, sel);
await scrollTo(380);                                                        // parallax + nav sólida
await scrollTo(await top('#escritorio') - 60); for (let i = 0; i < 8; i++) { await shot(); await sleep(70); }
await scrollTo(await top('#socias') - 76);
await p.mouse.move(320, 500); for (let i = 0; i < 12; i++) { await shot(); await sleep(90); }   // zoom do retrato e legenda
await scrollTo(await top('#areas') + 250);
for (const y of [300, 420, 540]) { await p.mouse.move(500, y); for (let i = 0; i < 6; i++) { await shot(); await sleep(80); } } // linha das áreas
await scrollTo(await top('#avaliacoes') - 40); for (let i = 0; i < 8; i++) { await shot(); await sleep(70); }
await scrollTo(await top('#duvidas') - 40);
await p.click('.faq details:nth-child(2) summary'); for (let i = 0; i < 8; i++) { await shot(); await sleep(60); }

fs.mkdirSync(path.join(ROOT, 'relatorios'), { recursive: true });
await sharp(frames, { join: { animated: true } }).webp({ quality: 70, delay: 70, loop: 0, effort: 4 }).toFile(path.join(ROOT, 'relatorios', 'previa-motion.webp'));
console.log('frames', frames.length);
await b.close(); s.close();
