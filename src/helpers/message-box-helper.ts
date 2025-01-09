import * as log from "@dsf/common/log"

export const info = (msg: string) => {
    MessageBox.information(msg, "", "Ok")
}

export const error = (message: string, writeLog?: boolean) => {
    if (writeLog) log.debug(message)
    MessageBox.critical(message, "Error", "Ok")
}

export const confirm = (message?: string): { ok: boolean, cancel: boolean } => {
    var response = MessageBox.question(message ?? "Confirm?", "", "Ok", "Cancel");

    return { ok: response == 0, cancel: response != 0 };
}