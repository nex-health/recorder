/**
 * @jest-environment node
 */

/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as puppeteer from "puppeteer";
import recorder from "../src/recorder";
import * as express from "express";

import { Readable } from "stream";

describe("Recorder", () => {
    let browser, page, app, url, server;
    
    async function getScriptFromStream(stream: Readable) {
        let script = "";
        stream.on("data", (data) => {
            script += data;
        });
    
        await new Promise((r) => stream.once("end", r));
    
        return script.replace(url, "[url]");
    }

    beforeAll(async () => {
        browser = await puppeteer.launch({
            defaultViewport: null,
            headless: false,
        });

        app = express();
        app.use(express.static(__dirname + "/public"));
        return new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                url = `http://localhost:${server.address().port}/`;
                resolve();
            });
        });
    });

    afterAll(async () => {
        await browser.close();
        await server.close();
    });

    beforeEach(async () => {
        const prevPage = await browser.pages().then((pages) => pages[0]);
        page = await browser.newPage();
        await prevPage.close();
    });

    it("should record a simple test", async () => {
        const output = await recorder(url, {
            wsEndpoint: browser.wsEndpoint(),
        });

        await page.click("#test");
        await browser.newPage();
        await page.close();

        await expect(getScriptFromStream(output)).resolves.toMatchInlineSnapshot(`
            "const {open, click, type, submit} = require('@pptr/recorder');
            open('[url]', {}, async () => {
              await click('aria/link[name=\\"Test Link\\"]');
            })
            "
          `);
    });
});
