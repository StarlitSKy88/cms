import { Flex, GridItem, Icon, Tooltip, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useRBAC } from '@strapi/helper-plugin';
import { ExclamationMarkCircle, ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../../../../admin/src/selectors';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

const BILLING_STRAPI_CLOUD_URL = 'https://cloud.strapi.io/profile/billing';
const BILLING_SELF_HOSTED_URL = 'https://strapi.io/billing/request-seats';

export const AdminSeatInfoEE = () => {
  const { formatMessage } = useIntl();
  const { settings } = useSelector(selectAdminPermissions);
  const {
    isLoading: isRBACLoading,
    allowedActions: { canRead, canCreate, canUpdate, canDelete },
  } = useRBAC(settings?.users ?? {});
  const {
    license,
    isError,
    isLoading: isLicenseLoading,
  } = useLicenseLimits({
    // TODO: this creates a waterfall which we should avoid to render earlier, but for that
    // we will have to move away from data-fetching hooks to query functions.
    // Short-term we could at least implement a loader, for the user to have visual feedback
    // in case the requests take a while
    enabled: !isRBACLoading && canRead && canCreate && canUpdate && canDelete,
  });

  const isLoading = isRBACLoading || isLicenseLoading;

  if (isError || isLoading || !license) {
    return null;
  }

  const { licenseLimitStatus, enforcementUserCount, permittedSeats, isHostedOnStrapiCloud } =
    license;

  if (!permittedSeats) {
    return null;
  }

  return (
    <GridItem col={6} s={12}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.admin-seats',
          defaultMessage: 'Admin seats',
        })}
      </Typography>
      <Flex gap={2}>
        <Flex>
          <Typography as="p">
            {formatMessage(
              {
                id: 'Settings.application.ee.admin-seats.count',
                defaultMessage: '<text>{enforcementUserCount}</text>/{permittedSeats}',
              },
              {
                permittedSeats,
                enforcementUserCount,
                text: (chunks) =>
                  (
                    <Typography
                      fontWeight="semiBold"
                      textColor={enforcementUserCount > permittedSeats ? 'danger500' : undefined}
                    >
                      {chunks}
                    </Typography>
                  ) as any,
              }
            )}
          </Typography>
        </Flex>
        {licenseLimitStatus === 'OVER_LIMIT' && (
          <Tooltip
            description={formatMessage({
              id: 'Settings.application.ee.admin-seats.at-limit-tooltip',
              defaultMessage: 'At limit: add seats to invite more users',
            })}
          >
            <Icon
              width={`${14 / 16}rem`}
              height={`${14 / 16}rem`}
              color="danger500"
              as={ExclamationMarkCircle}
            />
          </Tooltip>
        )}
      </Flex>
      <Link
        href={isHostedOnStrapiCloud ? BILLING_STRAPI_CLOUD_URL : BILLING_SELF_HOSTED_URL}
        isExternal
        endIcon={<ExternalLink />}
      >
        {formatMessage(
          {
            id: 'Settings.application.ee.admin-seats.add-seats',
            defaultMessage:
              '{isHostedOnStrapiCloud, select, true {Add seats} other {Contact sales}}',
          },
          { isHostedOnStrapiCloud }
        )}
      </Link>
    </GridItem>
  );
};
