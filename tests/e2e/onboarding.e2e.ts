import { expect } from "@wdio/globals";

describe("Onboarding Process", () => {
  it("should complete the onboarding process successfully", async () => {
    // Wait for the app to load
    await browser.waitUntil(
      async () => {
        const title = await $("h2");
        return title.isDisplayed();
      },
      {
        timeout: 5000,
        timeoutMsg: "App did not load in time",
      }
    );

    // Step 1: Project Info
    const projectNameInput = await $('input[placeholder="Enter project name"]');
    await projectNameInput.setValue("Test Project");

    const projectDescInput = await $(
      'textarea[placeholder="Enter project description"]'
    );
    await projectDescInput.setValue("Test Description");

    await $('button:contains("Next")').click();

    // Step 2: Initialize DVC
    await $('button:contains("Next")').click();

    // Step 3: Local Data
    const folderPathInput = await $('input[placeholder="Enter folder path"]');
    await folderPathInput.setValue("/tmp/test-folder");

    await $('button:contains("Next")').click();

    // Step 4: Remote Storage
    const storageTypeSelect = await $("select");
    await storageTypeSelect.selectByVisibleText("Local Path");

    const localPathInput = await $('input[placeholder="Enter local path"]');
    await localPathInput.setValue("/tmp/remote-storage");

    await $('button:contains("Next")').click();

    // Step 5: Review
    await $('button:contains("Complete Setup")').click();

    // Verify success message
    const successToast = await $(".toast-success");
    await expect(successToast).toBeDisplayed();
    await expect(successToast).toHaveTextContaining(
      "Project created successfully"
    );
  });
});
