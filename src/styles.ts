type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--primary)_28%,transparent)]";

export const disabledState = "disabled:cursor-not-allowed disabled:opacity-55";

export const appShellClass =
  "grid min-h-screen min-w-80 grid-cols-[260px_minmax(0,1fr)_290px] bg-[#f7f8f5] font-sans text-[#1d2520] antialiased dark:bg-[#151815] dark:text-[#f2f5ef] max-[1120px]:grid-cols-[220px_minmax(0,1fr)] max-[820px]:block";

export const sidebarClass =
  "sticky top-0 h-screen overflow-auto border-r border-[#d5ded8] bg-white p-4 dark:border-[#3c463f] dark:bg-[#1e231f] max-[820px]:static max-[820px]:h-auto max-[820px]:border-r-0 max-[820px]:border-b";

export const settingsRailClass =
  "sticky top-0 h-screen overflow-auto border-l border-[#d5ded8] bg-white p-4 dark:border-[#3c463f] dark:bg-[#1e231f] max-[1120px]:static max-[1120px]:col-span-full max-[1120px]:h-auto max-[1120px]:border-l-0 max-[1120px]:border-t";

export const brandBlockClass =
  "mb-6 flex min-h-14 items-center gap-3";

export const brandMarkClass =
  "grid size-[42px] place-items-center rounded-lg bg-[var(--primary)] font-extrabold text-white";

export const mutedUpperLabelClass =
  "mb-1 text-xs font-bold tracking-[0.08em] text-[#647067] uppercase dark:text-[#a9b5ad]";

export const navGroupClass =
  "mb-5 grid gap-1.5 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1";

export const navGroupLabelClass =
  cx(mutedUpperLabelClass, "max-[820px]:col-span-full");

export const navButtonClass =
  cx(
    "grid min-h-[42px] w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-[#647067] hover:bg-[#f0f4ef] hover:text-[#1d2520] dark:text-[#a9b5ad] dark:hover:bg-[#252d27] dark:hover:text-[#f2f5ef]",
    focusRing,
  );

export const navButtonActiveClass =
  "bg-[#f0f4ef] text-[#1d2520] dark:bg-[#252d27] dark:text-[#f2f5ef]";

export const kbdClass =
  "min-w-[52px] rounded-md border border-[#d5ded8] bg-white px-1.5 py-0.5 text-center text-[0.72rem] text-[#647067] dark:border-[#3c463f] dark:bg-[#1e231f] dark:text-[#a9b5ad]";

export const topbarClass =
  "sticky top-0 z-5 flex min-h-[76px] items-center justify-between gap-4 border-b border-[#d5ded8] bg-[#f7f8f5]/88 px-5 py-3.5 backdrop-blur-md dark:border-[#3c463f] dark:bg-[#151815]/88 max-[820px]:static max-[820px]:flex-col max-[820px]:items-start";

export const topbarMetaClass =
  "block text-[0.78rem] text-[#647067] dark:text-[#a9b5ad]";

export const topbarTitleClass =
  "block text-lg font-bold";

export const topbarControlsClass =
  "flex items-center gap-3 max-[520px]:w-full max-[520px]:flex-col max-[520px]:items-stretch";

export const selectLabelClass =
  "grid min-w-[150px] gap-1 max-[520px]:w-full";

export const fieldLabelClass = "grid gap-1.5";

export const fieldTextClass =
  "text-sm font-bold text-[#647067] dark:text-[#a9b5ad]";

export const controlClass =
  cx(
    "min-h-[42px] w-full rounded-lg border border-[#d5ded8] bg-white px-3 py-2.5 text-[#1d2520] outline-none dark:border-[#3c463f] dark:bg-[#1e231f] dark:text-[#f2f5ef]",
    focusRing,
  );

export const compactSelectClass = cx(controlClass, "min-h-9 py-1.5");

export const textareaClass = cx(controlClass, "min-h-28 resize-y");

export const segmentedControlClass =
  "flex min-w-[82px] overflow-hidden rounded-lg border border-[#d5ded8] bg-white dark:border-[#3c463f] dark:bg-[#1e231f] max-[520px]:w-full";

export const segmentedButtonClass =
  cx(
    "grid size-[40px] h-[38px] cursor-pointer place-items-center border-0 bg-transparent text-[#647067] dark:text-[#a9b5ad] max-[520px]:w-1/2",
    focusRing,
  );

export const segmentedButtonActiveClass =
  "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[#1d2520] dark:text-[#f2f5ef]";

export const pageSurfaceClass =
  "mx-auto w-[min(1160px,100%)] p-5 max-[520px]:p-3.5";

export const contentStackClass = "grid gap-4";

export const pageGridClass = "grid gap-4";

export const sectionHeadingClass = "py-1";

export const eyebrowClass =
  "mb-3 text-[0.78rem] font-extrabold tracking-[0.12em] text-[var(--primary)] uppercase";

export const pageTitleClass =
  "mb-4 max-w-[900px] text-4xl leading-none font-bold tracking-normal md:text-5xl";

export const mutedCopyClass =
  "max-w-[760px] text-[#647067] dark:text-[#a9b5ad]";

export const panelClass =
  "rounded-lg border border-[#d5ded8] bg-white shadow-[0_14px_40px_rgba(27,37,32,0.1)] dark:border-[#3c463f] dark:bg-[#1e231f] dark:shadow-[0_14px_40px_rgba(0,0,0,0.28)]";

export const actionRowClass =
  "flex flex-wrap items-center gap-3 max-[520px]:flex-col max-[520px]:items-stretch";

export const primaryActionClass =
  cx(
    "inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[var(--primary)] px-3.5 py-2.5 font-bold text-white hover:brightness-90 max-[520px]:w-full",
    focusRing,
    disabledState,
  );

export const secondaryActionClass =
  cx(
    "inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#d5ded8] bg-white px-3.5 py-2.5 font-bold text-[#1d2520] hover:bg-[#f0f4ef] dark:border-[#3c463f] dark:bg-[#1e231f] dark:text-[#f2f5ef] dark:hover:bg-[#252d27] max-[520px]:w-full",
    focusRing,
    disabledState,
  );

export const featureGridClass =
  "grid grid-cols-3 gap-4 max-[820px]:grid-cols-1";

export const featureCardClass =
  "min-h-[190px] rounded-lg border border-[#d5ded8] bg-white p-4 dark:border-[#3c463f] dark:bg-[#1e231f]";

export const featureIconBaseClass =
  "mb-4 grid size-[42px] place-items-center rounded-lg";

export const metadataGridClass =
  cx(panelClass, "grid grid-cols-2 overflow-hidden max-[820px]:grid-cols-1");

export const metadataRowClass =
  "flex min-h-[76px] items-center justify-between gap-4 border-b border-[#d5ded8] p-4 dark:border-[#3c463f] max-[820px]:border-b";

export const bridgePanelClass =
  cx(
    panelClass,
    "flex items-center justify-between gap-4 p-4 max-[520px]:flex-col max-[520px]:items-stretch",
  );

export const formPanelClass = cx(panelClass, "grid max-w-[760px] gap-4 p-4");

export const composerClass =
  cx(panelClass, "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 p-4 max-[820px]:grid-cols-1");

export const formFooterClass =
  "flex flex-wrap items-center gap-3 max-[520px]:flex-col max-[520px]:items-stretch";

export const toggleRowClass =
  "inline-flex w-auto items-center gap-2";

export const checkboxClass =
  cx("size-[18px] min-h-[18px] accent-[var(--primary)]", focusRing);

export const errorTextClass = "font-bold text-[#9c3d4c] dark:text-[#f08c9a]";

export const statusTextClass = "m-0 font-bold text-[var(--primary)]";

export const tableToolbarClass =
  "flex flex-wrap items-end gap-3 rounded-lg border border-[#d5ded8] bg-white p-3 dark:border-[#3c463f] dark:bg-[#1e231f] max-[820px]:grid max-[820px]:grid-cols-1";

export const resultCountClass =
  "m-0 font-bold text-[#647067] dark:text-[#a9b5ad]";

export const tableShellClass = cx(panelClass, "overflow-auto");

export const tableClass = "w-full min-w-[850px] border-collapse";

export const tableCellClass =
  "border-b border-[#d5ded8] px-3.5 py-3 text-left whitespace-nowrap dark:border-[#3c463f]";

export const tableHeadCellClass =
  cx(tableCellClass, "bg-[#f0f4ef] dark:bg-[#252d27]");

export const tableSortButtonClass =
  cx(
    "inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent font-extrabold text-[#1d2520] dark:text-[#f2f5ef]",
    focusRing,
  );

export const sortBadgeClass =
  "rounded-md bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] px-1.5 py-0.5 text-[0.7rem] text-[var(--primary)]";

export const dropZoneClass =
  cx(
    panelClass,
    "grid min-h-[220px] cursor-pointer place-items-center border-dashed p-6 text-center text-[#647067] dark:text-[#a9b5ad]",
    focusRing,
  );

export const dropZoneDraggingClass =
  "border-[#2f6687] bg-[#dbeef7] dark:border-[#8ac8e5] dark:bg-[#203d4a]";

export const hiddenFileClass =
  "pointer-events-none absolute size-px opacity-0";

export const listPanelClass = cx(panelClass, "p-4");

export const listHeadingClass =
  "mb-3 flex flex-wrap items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-stretch";

export const plainListClass = "m-0 grid list-none gap-2 p-0";

export const listItemClass =
  "flex items-center justify-between gap-4 rounded-lg border border-[#d5ded8] bg-[#f0f4ef] p-3 dark:border-[#3c463f] dark:bg-[#252d27] max-[520px]:flex-col max-[520px]:items-stretch";

export const listItemTitleClass =
  "min-w-0 [overflow-wrap:anywhere] font-bold";

export const listItemMetaClass =
  "shrink-0 text-[#647067] dark:text-[#a9b5ad]";

export const emptyStateClass =
  "mb-0 text-[#647067] dark:text-[#a9b5ad]";

export const settingsHeadingClass =
  "mb-4 flex min-h-[42px] items-center gap-2";

export const nativeSettingsClass =
  "mb-5 grid gap-3 border-b border-[#d5ded8] pb-5 dark:border-[#3c463f]";

export const settingsGridClass = "grid gap-3";

export const colorFieldGridClass =
  "grid grid-cols-[48px_minmax(0,1fr)] gap-2";

export const colorInputClass =
  cx(controlClass, "cursor-pointer p-1");

export const switchFieldClass =
  "grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2 rounded-lg border border-[#d5ded8] bg-[#f0f4ef] p-3 dark:border-[#3c463f] dark:bg-[#252d27]";

export const switchTextClass = "grid min-w-0 gap-0.5";

export const switchHelpClass =
  "text-[#647067] leading-snug dark:text-[#a9b5ad]";

export const actionBarClass = "grid grid-cols-3 gap-2 max-[520px]:grid-cols-1";

export const saveStateClass =
  "ml-auto min-w-[70px] shrink-0 rounded-full border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] px-2 py-1 text-center text-[0.72rem] font-extrabold text-[var(--primary)]";

export const saveStateDirtyClass =
  "border-[#8a5b00] bg-[#fff0c7] text-[#8a5b00] dark:border-[#f0bd59] dark:bg-[#453616] dark:text-[#f0bd59]";

export const noticeClass =
  "m-0 min-h-6 text-[0.86rem] leading-normal text-[#647067] dark:text-[#a9b5ad]";

export const noticeSuccessClass = "text-[var(--primary)]";

export const noticeErrorClass = "text-[#9c3d4c] dark:text-[#f08c9a]";

export const featureTogglesClass =
  "grid gap-2 max-[1120px]:grid-cols-2 max-[820px]:grid-cols-1";

export const featureToggleLabelClass =
  "grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2 rounded-lg border border-[#d5ded8] bg-[#f0f4ef] p-3 dark:border-[#3c463f] dark:bg-[#252d27]";

export const featureToggleTextClass =
  "min-w-0 [overflow-wrap:anywhere] text-sm";

export const iconClass = "size-[1.1em] shrink-0";
