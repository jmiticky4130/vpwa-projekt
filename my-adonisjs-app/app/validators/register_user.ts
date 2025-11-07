import vine from '@vinejs/vine'

export const registerUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    // Align confirmation with frontend field name "passwordConfirmation"
    password: vine.string().minLength(8),
    nickname: vine.string().minLength(3).maxLength(30),
    firstName: vine.string().minLength(1).maxLength(50),
    lastName: vine.string().minLength(1).maxLength(50),
  })
)
