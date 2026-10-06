/**
 * Application-layer input — the minimal shape the create-user use case needs.
 *
 * OTP verification happens before this use case, so OTP does not belong here.
 * Username is required because it is the user's public identity in Kashki.
 */
export class CreateUserInput {
  email!: string;
  password!: string;
  userName!: string;
}
