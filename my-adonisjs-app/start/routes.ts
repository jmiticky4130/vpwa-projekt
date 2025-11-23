import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const ChannelController = () => import('#controllers/channel_controller')
const UsersController = () => import('#controllers/users_controller')
const MessagesController = () => import('#controllers/messages_controller')
const InvitesController = () => import('#controllers/invites_controller')

router
  .group(() => {
    router.post('register', [AuthController, 'register'])
    router.post('login', [AuthController, 'login'])
    router.post('logout', [AuthController, 'logout']).use(middleware.auth())
    router.get('me', [AuthController, 'me']).use(middleware.auth())
  })
  .prefix('auth')

router
  .group(() => {
    router.post('create', [ChannelController, 'create']).use(middleware.auth())
    router.post('delete', [ChannelController, 'delete']).use(middleware.auth())
    router.get('list', [ChannelController, 'list']).use(middleware.auth())
    router.post('join', [ChannelController, 'join']).use(middleware.auth())
    router.post('leave', [ChannelController, 'leave']).use(middleware.auth())
    router.post('revoke', [ChannelController, 'revoke']).use(middleware.auth())
    router.post('kick', [ChannelController, 'kick']).use(middleware.auth())
    router.patch('privacy', [ChannelController, 'privacy']).use(middleware.auth())
  })
  .prefix('channel')

// Data fetch endpoints (top-level)
router.get('users/get', [UsersController, 'getByChannel']).use(middleware.auth())
router.get('messages/get', [MessagesController, 'getByChannel']).use(middleware.auth())
// Invites endpoints
router.get('invites', [InvitesController, 'list']).use(middleware.auth())
router.post('invites/create', [InvitesController, 'create']).use(middleware.auth())
router.post('invites/respond', [InvitesController, 'respond']).use(middleware.auth())
