/**
 * Server actions return this instead of throwing, so a form can render the
 * message inline. Thrown errors in actions surface as an opaque digest in
 * production, which is useless to the person filling in the form.
 */
export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? { data?: undefined } : { data: T }))
  | { ok: false; message: string; field?: string };

export function actionError(message: string, field?: string): ActionResult<never> {
  return { ok: false, message, field };
}
