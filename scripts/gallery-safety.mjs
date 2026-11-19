/** Refuse gallery captures containing the app's visible public-default session-secret warning. Never inspect secret values. */
export async function assertSafeGalleryFrame(page) {
  if (await page.getByTestId("public-session-secret").isVisible()) {
    throw new Error("GalleryUnsafeSessionSecret: the public-default SESSION_SECRET notice is visible; start the recording app with a private signing secret.");
  }
}
