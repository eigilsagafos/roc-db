import type { Transaction } from "roc-db"
import type { ValdresEngine } from "./ValdresEngine"

export type ValdresTransaction = Transaction<ValdresEngine>
