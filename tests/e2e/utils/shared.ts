import { test, expect, type Page, type Locator } from '@playwright/test';

type NavItem = string | [string, string] | Locator;

/**
 * Execute a test suite only if the condition is true
 */
export const describeOnCondition = (shouldDescribe: boolean) =>
  shouldDescribe ? test.describe : test.describe.skip;

/**
 * Find an element in the dom after the previous element
 * Useful for narrowing down which link to click when there are multiple with the same name
 */
// TODO: instead of siblingText + linkText, accept an array of any number items
export const locateFirstAfter = async (page: Page, firstText: string, secondText: string) => {
  // It first searches for text containing "firstText" then uses xpath `following` to find "secondText" after it.
  // `translate` is used to make the search case-insensitive
  const item = page
    .locator(
      `xpath=//text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${firstText.toLowerCase()}")]/following::a[starts-with(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${secondText.toLowerCase()}")]`
    )
    .first();

  return item;
};

/**
 * Navigate to a page and confirm the header, awaiting each step
 */
export const navToHeader = async (page: Page, navItems: NavItem[], headerText: string) => {
  for (const navItem of navItems) {
    // This handles some common issues
    // 1. Uses name^= to only ensure starts with, because for example badge notifications cause "Settings" to really be "Settings 1"
    // 2. To avoid duplicates, we accept a locator
    // 3. To avoid duplicates and writing complex locators, we accept an array to pass to locateFirstAfter, which matches item0 then finds the next item1 in the dom
    let item;
    if (typeof navItem === 'string') {
      item = page.locator(`role=link[name^="${navItem}"]`).last();
    } else if (Array.isArray(navItem)) {
      item = await locateFirstAfter(page, navItem[0], navItem[1]);
    } else {
      // it's a Locator
      item = navItem;
    }

    await expect(item).toBeVisible();
    await item.click();
  }

  // Verify header is correct
  const header = page.getByRole('heading', { name: headerText, exact: true });
  await expect(header).toBeVisible();
  return header;
};

/**
 * Skip the tour if the modal is visible
 */
export const skipCtbTour = async (page: Page) => {
  try {
    const modal = await page.getByRole('button', { name: 'Skip the tour' });

    if (await modal.isVisible()) {
      await modal.click();
      await expect(modal).not.toBeVisible();
    }
  } catch (e) {
    // The modal did not appear, continue with the test
  }
};

/**
 * Clicks on a link and waits for the page to load completely.
 *
 * NOTE: this util is used to avoid inconsistent behaviour on webkit
 *
 */
export const clickAndWait = async (page: Page, locator: Locator) => {
  await locator.click();
  await page.waitForLoadState('networkidle');
};

/**
 * Look for an element containing text, and then click a sibling close button
 */
export const findAndClose = async (
  page: Page,
  text: string,
  role: string = 'status',
  closeLabel: string = 'Close'
) => {
  // Verify the popup text is visible.
  const elements = page.locator(`:has-text("${text}")[role="${role}"]`);
  await expect(elements.first()).toBeVisible(); // expect at least one element

  // Find all 'Close' buttons that are siblings of the elements containing the specified text.
  const closeBtns = page.locator(
    `:has-text("${text}")[role="${role}"] ~ button:has-text("${closeLabel}")`
  );

  // Click all 'Close' buttons.
  const count = await closeBtns.count();
  for (let i = 0; i < count; i++) {
    await closeBtns.nth(i).click();
  }
};

/**
 * Finds a specific cell in a table by matching both the row text and the column header text.
 *
 * This function performs the following steps:
 * 1. Finds a row in the table that contains the specified `rowText` (case-insensitive).
 * 2. Finds the column header in the table that contains the specified `columnText` (case-insensitive).
 * 3. Identifies the cell in the located row that corresponds to the column where the header matches the `columnText`.
 * 4. Returns the found cell for further interactions or assertions.
 *
 * @param {Page} page - The Playwright `Page` object representing the browser page.
 * @param {string} rowText - The text to match in the row (case-insensitive).
 * @param {string} columnText - The text to match in the column header (case-insensitive).
 *
 * @returns {Locator} - A Playwright Locator object representing the intersecting cell.
 *
 * @throws Will throw an error if the row or column header is not found, or if the cell is not visible.
 *
 * @warning This function assumes a standard table structure where each row has an equal number of cells,
 *          and no cells are merged (`colspan` or `rowspan`). If the table contains merged cells,
 *          this method may return incorrect results or fail to locate the correct cell.
 *          Matches the header exactly (cell contains only exact text)
 *          Matches the row loosely (finds a row containing that text somewhere)
 */
export const findByRowColumn = async (page: Page, rowText: string, columnText: string) => {
  // Locate the row that contains the rowText
  // This just looks for the text in a row, so ensure that it is specific enough
  const row = page.locator('tr').filter({ hasText: new RegExp(`${rowText}`) });
  await expect(row).toBeVisible();

  // Locate the column header that matches the columnText
  // This assumes that header is exact (cell only contains that text and nothing else)
  const header = page.locator('thead th').filter({ hasText: new RegExp(`^${columnText}$`, 'i') });
  await expect(header).toBeVisible();

  // Find the index of the matching column header
  const columnIndex = await header.evaluate((el) => Array.from(el.parentNode.children).indexOf(el));

  // Find the cell in the located row that corresponds to the matching column index
  const cell = row.locator(`td:nth-child(${columnIndex + 1})`);
  await expect(cell).toBeVisible();

  // Return the found cell
  return cell;
};

/**
 * Drags a draggable element within an <li> containing `sourceText`
 * to just above an <li> containing `targetText`, with smooth movement.
 *
 * @param {object} page - The Playwright page instance.
 * @param {string} sourceText - Text inside the <li> containing the draggable element.
 * @param {string} targetText - Text inside the <li> to drag the element above.
 * @param {number} steps - Number of intermediate steps for smooth movement (default: 20).
 * @param {number} delay - Delay in milliseconds between steps (default: 50ms).
 */
async function dragAboveSmooth(page, sourceText, targetText, steps = 20, delay = 50) {
  const source = page.locator('li', { hasText: sourceText }).locator('[draggable="true"]');
  const target = page.locator('li', { hasText: targetText });

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (sourceBox && targetBox) {
    // Calculate start and end positions
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y - 10; // 10 pixels above the target

    // Move to the starting position and press the mouse
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Incrementally move the mouse for smooth dragging
    for (let i = 1; i <= steps; i++) {
      const intermediateX = startX + (endX - startX) * (i / steps);
      const intermediateY = startY + (endY - startY) * (i / steps);
      await page.mouse.move(intermediateX, intermediateY);
      await page.waitForTimeout(delay); // Add delay for smooth effect
    }

    // Release the mouse to drop the element
    await page.mouse.up();
    console.log(`Smoothly dragged element from "${sourceText}" to above "${targetText}".`);
  } else {
    console.error('Bounding boxes for source or target could not be determined.');
  }
}

/**
 * Smoothly drags a draggable element within a source <li> to just above a target <li>,
 * with optional viewport resizing. Resizes back to the original viewport if adjusted.
 *
 * @param {object} page - The Playwright page instance.
 * @param {object} options - Options for the drag operation.
 * @param {object} options.source - Locator for the source <li> (containing the draggable element).
 * @param {object} options.target - Locator for the target <li> (drop destination).
 * @param {number} [options.steps=5] - Number of steps for smooth movement.
 * @param {number} [options.delay=10] - Delay in milliseconds between steps.
 * @param {number} [options.resizeHeight] - Optional viewport height adjustment.
 */
export const dragElementAbove = async (page, options) => {
  const { source, target, steps = 5, delay = 10, resizeHeight } = options;

  // Save the current viewport size
  const currentViewport = page.viewportSize();

  // Optionally resize the viewport
  if (resizeHeight) {
    await page.setViewportSize({ width: currentViewport.width, height: resizeHeight });
  }

  // Locate the draggable button within the source <li>
  const draggable = source.locator('[draggable="true"]');

  // Get bounding boxes of the draggable button and target <li>
  const sourceBox = await draggable.boundingBox();
  const targetBox = await target.boundingBox();

  if (sourceBox && targetBox) {
    // Calculate start and end positions
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y - 1; // 1 pixel above the target

    // Move to the starting position and press the mouse
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Incrementally move the mouse for smooth dragging
    for (let i = 1; i <= steps; i++) {
      const intermediateX = startX + (endX - startX) * (i / steps);
      const intermediateY = startY + (endY - startY) * (i / steps);
      await page.mouse.move(intermediateX, intermediateY);
      await page.waitForTimeout(delay);
    }

    // Release the mouse to drop the element
    await page.mouse.up();
  } else {
    throw new Error('Bounding boxes for source or target could not be determined.');
  }

  // Reset viewport to its original size if it was resized
  if (resizeHeight) {
    await page.setViewportSize(currentViewport);
  }
};

/**
 * Returns true if the first element appears before the second element in the DOM.
 *
 * @param {object} firstLocator - Playwright locator for the first element.
 * @param {object} secondLocator - Playwright locator for the second element.
 * @returns {Promise<boolean>} - Returns true if the first element is before the second element.
 */
export const isElementBefore = async (firstLocator, secondLocator) => {
  const firstHandle = await firstLocator.elementHandle();
  const secondHandle = await secondLocator.elementHandle();

  if (!firstHandle || !secondHandle) {
    throw new Error('One or both elements could not be found.');
  }

  // Compare positions in the DOM and return a boolean
  return await firstHandle.evaluate((first, second) => {
    return !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, secondHandle);
};
