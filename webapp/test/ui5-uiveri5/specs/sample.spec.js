describe("UI5 App Test", () => {
    it("should open the app", async () => {
        await browser.url("/");
        const title = await browser.getTitle();
        console.log("Title:", title);
    });
});