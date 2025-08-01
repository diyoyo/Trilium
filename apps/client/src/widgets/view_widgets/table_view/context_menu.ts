import { ColumnComponent, MenuSeparator, RowComponent, Tabulator } from "tabulator-tables";
import contextMenu, { MenuItem } from "../../../menus/context_menu.js";
import { TableData } from "./rows.js";
import branches from "../../../services/branches.js";
import { t } from "../../../services/i18n.js";
import link_context_menu from "../../../menus/link_context_menu.js";
import type FNote from "../../../entities/fnote.js";
import froca from "../../../services/froca.js";
import type Component from "../../../components/component.js";

export function setupContextMenu(tabulator: Tabulator, parentNote: FNote) {
    tabulator.on("rowContext", (e, row) => showRowContextMenu(e, row, parentNote, tabulator));
    tabulator.on("headerContext", (e, col) => showColumnContextMenu(e, col, tabulator));

    // Pressing the expand button prevents bubbling and the context menu remains menu when it shouldn't.
    if (tabulator.options.dataTree) {
        const dismissContextMenu = () => contextMenu.hide();
        tabulator.on("dataTreeRowExpanded", dismissContextMenu);
        tabulator.on("dataTreeRowCollapsed", dismissContextMenu);
    }
}

function showColumnContextMenu(_e: UIEvent, column: ColumnComponent, tabulator: Tabulator) {
    const e = _e as MouseEvent;
    const { title, field } = column.getDefinition();

    const sorters = tabulator.getSorters();
    const sorter = sorters.find(sorter => sorter.field === field);

    contextMenu.show({
        items: [
            {
                title: t("table_view.sort-column-by", { title }),
                enabled: !!field,
                uiIcon: "bx bx-sort-alt-2",
                items: [
                    {
                        title: t("table_view.sort-column-ascending"),
                        checked: (sorter?.dir === "asc"),
                        uiIcon: "bx bx-empty",
                        handler: () => tabulator.setSort([
                            {
                                column: field!,
                                dir: "asc",
                            }
                        ])
                    },
                    {
                        title: t("table_view.sort-column-descending"),
                        checked: (sorter?.dir === "desc"),
                        uiIcon: "bx bx-empty",
                        handler: () => tabulator.setSort([
                            {
                                column: field!,
                                dir: "desc"
                            }
                        ])
                    }
                ]
            },
            {
                title: t("table_view.sort-column-clear"),
                enabled: sorters.length > 0,
                uiIcon: "bx bx-empty",
                handler: () => tabulator.clearSort()
            },
            {
                title: "----"
            },
            {
                title: t("table_view.hide-column", { title }),
                enabled: !!field,
                uiIcon: "bx bx-hide",
                handler: () => column.hide()
            },
            {
                title: t("table_view.show-hide-columns"),
                uiIcon: "bx bx-empty",
                items: buildColumnItems()
            },
            { title: "----" },
            {
                title: t("table_view.add-column-to-the-left"),
                uiIcon: "bx bx-horizontal-left",
                handler: () => getParentComponent(e)?.triggerCommand("addNewTableColumn", {
                    referenceColumn: column
                })
            },
            {
                title: t("table_view.edit-column"),
                uiIcon: "bx bx-edit",
                handler: () => getParentComponent(e)?.triggerCommand("addNewTableColumn", {
                    columnToEdit: column
                })
            },
            {
                title: t("table_view.add-column-to-the-right"),
                uiIcon: "bx bx-horizontal-right",
                handler: () => getParentComponent(e)?.triggerCommand("addNewTableColumn", {
                    referenceColumn: column,
                    direction: "after"
                })
            }
        ],
        selectMenuItemHandler() {},
        x: e.pageX,
        y: e.pageY
    });
    e.preventDefault();

    function buildColumnItems() {
        const items: MenuItem<unknown>[] = [];
        for (const column of tabulator.getColumns()) {
            const { title, field } = column.getDefinition();

            items.push({
                title,
                checked: column.isVisible(),
                uiIcon: "bx bx-empty",
                enabled: !!field,
                handler: () => column.toggle()
            });
        }

        return items;
    }
}

export function showRowContextMenu(_e: UIEvent, row: RowComponent, parentNote: FNote, tabulator: Tabulator) {
    const e = _e as MouseEvent;
    const rowData = row.getData() as TableData;

    let parentNoteId: string = parentNote.noteId;

    if (tabulator.options.dataTree) {
        const parentRow = row.getTreeParent();
        if (parentRow) {
            parentNoteId = parentRow.getData().noteId as string;
        }
    }

    contextMenu.show({
        items: [
            ...link_context_menu.getItems(),
            { title: "----" },
            {
                title: t("table_view.row-insert-above"),
                uiIcon: "bx bx-list-plus",
                handler: () => getParentComponent(e)?.triggerCommand("addNewRow", {
                    parentNotePath: parentNoteId,
                    customOpts: {
                        target: "before",
                        targetBranchId: rowData.branchId,
                    }
                })
            },
            {
                title: t("table_view.row-insert-child"),
                uiIcon: "bx bx-empty",
                handler: async () => {
                    const branchId = row.getData().branchId;
                    const note = await froca.getBranch(branchId)?.getNote();
                    getParentComponent(e)?.triggerCommand("addNewRow", {
                        parentNotePath: note?.noteId,
                        customOpts: {
                            target: "after",
                            targetBranchId: branchId,
                        }
                    });
                }
            },
            {
                title: t("table_view.row-insert-below"),
                uiIcon: "bx bx-empty",
                handler: () => getParentComponent(e)?.triggerCommand("addNewRow", {
                    parentNotePath: parentNoteId,
                    customOpts: {
                        target: "after",
                        targetBranchId: rowData.branchId,
                    }
                })
            },
            { title: "----" },
            {
                title: t("table_context_menu.delete_row"),
                uiIcon: "bx bx-trash",
                handler: () => branches.deleteNotes([ rowData.branchId ], false, false)
            }
        ],
        selectMenuItemHandler: ({ command }) =>  link_context_menu.handleLinkContextMenuItem(command, rowData.noteId),
        x: e.pageX,
        y: e.pageY
    });
    e.preventDefault();
}

function getParentComponent(e: MouseEvent) {
    if (!e.target) {
        return;
    }

    return $(e.target)
        .closest(".component")
        .prop("component") as Component;
}
