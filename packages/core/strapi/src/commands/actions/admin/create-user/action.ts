import { yup } from '@strapi/utils';
import _ from 'lodash';
import inquirer from 'inquirer';
import strapi from '../../../../index';

interface CmdOptions {
  email?: string;
  password?: string;
  firstname?: string;
  lastname?: string;
}

const emailValidator = yup.string().email('Invalid email address').lowercase();

const passwordValidator = yup
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .matches(/[a-z]/, 'Password must contain at least one lowercase character')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase character')
  .matches(/\d/, 'Password must contain at least one number');

const adminCreateSchema = yup.object().shape({
  email: emailValidator,
  password: passwordValidator,
  firstname: yup.string().trim().required('First name is required'),
  lastname: yup.string(),
});

interface Answers {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  confirm: boolean;
}

const promptQuestions: inquirer.DistinctQuestion<Answers> = [
  {
    type: 'input',
    name: 'email',
    message: 'Admin email?',
    async validate(value: string) {
      const validEmail = await emailValidator.validate(value);
      return validEmail === value || validEmail;
    },
  },
  {
    type: 'password',
    name: 'password',
    message: 'Admin password?',
    async validate(value: string) {
      const validPassword = await passwordValidator.validate(value);
      return validPassword === value || validPassword;
    },
  },
  { type: 'input', name: 'firstname', message: 'First name?' },
  { type: 'input', name: 'lastname', message: 'Last name?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to create a new admin?',
  },
];

/**
 * Create new admin user
 */
export default async (cmdOptions: CmdOptions = {}) => {
  let { email, password, firstname, lastname } = cmdOptions;

  if (
    _.isEmpty(email) &&
    _.isEmpty(password) &&
    _.isEmpty(firstname) &&
    _.isEmpty(lastname) &&
    process.stdin.isTTY
  ) {
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    ({ email, password, firstname, lastname } = inquiry);
  }

  try {
    await adminCreateSchema.validate({ email, password, firstname, lastname });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      console.error(err.errors[0]);
    }

    process.exit(1);
  }

  return createAdmin({ email, password, firstname, lastname });
};

async function createAdmin({ email, password, firstname, lastname }: CmdOptions) {
  const appContext = await strapi.compile();
  const app = await strapi(appContext).load();

  const user = await app.admin.services.user.exists({ email });

  if (user) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const superAdminRole = await app.admin.services.role.getSuperAdmin();

  await app.admin.services.user.create({
    email,
    firstname,
    lastname,
    isActive: true,
    roles: [superAdminRole.id],
    ...(password && { password, registrationToken: null }),
  });

  console.log(`Successfully created new admin`);
  process.exit(0);
}
