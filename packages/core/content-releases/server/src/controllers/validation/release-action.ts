import { yup, validateYupSchema } from '@strapi/utils';

const RELEASE_ACTION_SCHEMA = yup.object().shape({
  entry: yup
    .object()
    .shape({
      documentId: yup.strapiID(),
      contentType: yup.string().required(),
      locale: yup.string(),
    })
    .required(),
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

const RELEASE_ACTION_UPDATE_SCHEMA = yup.object().shape({
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

export const validateReleaseAction = validateYupSchema(RELEASE_ACTION_SCHEMA);
export const validateReleaseActionUpdateSchema = validateYupSchema(RELEASE_ACTION_UPDATE_SCHEMA);
