import { useState } from "react";
import { Link } from "react-router-dom";
import FileContextMenu from '../components/FileContextMenu'

const breadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Projects", to: "/projects" },
  { label: "Q4 Marketing", to: null },
];

const tableFiles = [
  {
    id: 1,
    name: "Marketing Assets",
    type: "folder",
    icon: "folder",
    iconColor: "text-yellow-500",
    iconBg: null,
    iconSize: "text-3xl",
    owners: [
      { initials: "SM", color: "bg-pink-500" },
      { initials: null, badge: "You" },
    ],
    modified: "Oct 24, 2023",
    size: "-",
    selected: false,
  },
  {
    id: 2,
    name: "Logo_V2.fig",
    type: "file",
    icon: "image",
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
    iconSize: "text-xl",
    owners: [
      { initials: "SM", color: "bg-pink-500" },
      { initials: "JD", color: "bg-blue-500" },
    ],
    modified: "2 min ago",
    size: "14 MB",
    selected: true,
  },
  {
    id: 3,
    name: "Q3_Report.pdf",
    type: "file",
    icon: "picture_as_pdf",
    iconColor: "text-red-500",
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconSize: "text-xl",
    owners: [{ initials: null, badge: "You" }],
    modified: "Yesterday",
    size: "2.4 MB",
    selected: false,
  },
  {
    id: 4,
    name: "Budget_2024.xlsx",
    type: "file",
    icon: "table_chart",
    iconColor: "text-green-500",
    iconBg: "bg-green-50 dark:bg-green-500/10",
    iconSize: "text-xl",
    owners: [{ initials: "MR", color: "bg-teal-500" }],
    modified: "Oct 20, 2023",
    size: "850 KB",
    selected: false,
  },
];

function FileItemIcon({ file }) {
  if (file.type === 'folder') {
    return (
      <span className={`material-symbols-outlined ${file.iconSize} ${file.iconColor} fill-current`}>
        {file.icon}
      </span>
    )
  }
  return (
    <div className={`w-9 h-9 rounded-lg ${file.iconBg} flex items-center justify-center flex-shrink-0`}>
      <span className={`material-symbols-outlined ${file.iconSize} ${file.iconColor}`}>
        {file.icon}
      </span>
    </div>
  )
}

function OwnerList({ owners }) {
  return (
    <div className="flex items-center gap-1.5">
      {owners.map((owner) =>
        owner.badge ? (
          <span key={owner.badge} className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {owner.badge}
          </span>
        ) : (
          <div key={owner.initials} className={`w-7 h-7 rounded-full ${owner.color} flex items-center justify-center text-[10px] font-semibold text-white -ml-1 first:ml-0 ring-2 ring-white dark:ring-background-dark`}>
            {owner.initials}
          </div>
        )
      )}
    </div>
  )
}

export default function FileExplorerList() {
  const [view, setView] = useState("list");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar bar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">
                  chevron_right
                </span>
              )}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900 dark:text-white">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* View toggle + Filter */}
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-surface-dark rounded-lg p-1">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-all ${
                view === "grid"
                  ? "bg-white dark:bg-border-dark text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span className="material-symbols-outlined">
                grid_view
              </span>
              Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-all ${
                view === "list"
                  ? "bg-white dark:bg-border-dark text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span className="material-symbols-outlined">
                view_list
              </span>
              List
            </button>
          </div>

          {/* Filter button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors">
            <span className="material-symbols-outlined">
              filter_list
            </span>
            Filter
          </button>
        </div>
      </div>

      {/* File table */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white dark:bg-background-dark">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#151e26] sticky top-0 z-10">
                <th className="w-[40%] text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="w-[20%] text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="w-[20%] text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="w-[10%] text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="w-[10%] text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tableFiles.map((file) => (
                <tr
                  key={file.id}
                  className={`group border-b border-slate-100 dark:border-border-dark transition-colors cursor-pointer ${
                    file.selected
                      ? "bg-blue-50/50 dark:bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-slate-50 dark:hover:bg-[#151e26]"
                  }`}
                >
                  {/* Name */}
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileItemIcon file={file} />
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {file.name}
                      </span>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3.5">
                    <OwnerList owners={file.owners} />
                  </td>

                  {/* Last Modified */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {file.modified}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {file.size}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-3.5 text-right">
                    <FileContextMenu forceVisible={file.selected} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
