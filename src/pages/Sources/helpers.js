import React from 'react';
import awesomeDebounce from 'awesome-debounce-promise';

import { AlertActionLink } from '@patternfly/react-core/dist/js/components/Alert/AlertActionLink';

import computeSourceStatus from '@redhat-cloud-services/frontend-components-sources/cjs/computeSourceStatus';

import { loadEntities, filterSources, addMessage, removeMessage } from '../../redux/sources/actions';
import { replaceRouteId, routes } from '../../Routes';
import { AVAILABLE } from '../../views/formatters';

export const debouncedFiltering = awesomeDebounce((refresh) => refresh(), 500);

export const afterSuccessLoadParameters = {
  pageNumber: 1,
  sortBy: 'created_at',
  sortDirection: 'desc',
};

export const afterSuccess = (dispatch) => dispatch(loadEntities(afterSuccessLoadParameters));

export const prepareSourceTypeSelection = (sourceTypes) =>
  sourceTypes.map(({ id, product_name }) => ({ label: product_name, value: id })).sort((a, b) => a.label.localeCompare(b.label));

export const prepareApplicationTypeSelection = (appTypes) =>
  appTypes.map(({ id, display_name }) => ({ label: display_name, value: id })).sort((a, b) => a.label.localeCompare(b.label));

export const setFilter = (column, value, dispatch) =>
  dispatch(
    filterSources({
      [column]: value,
    })
  );

export const chipsFormatters = (key, filterValue, sourceTypes, appTypes, intl) =>
  ({
    name: () => ({ name: filterValue[key], key }),
    source_type_id: () => ({
      category: 'Source Type',
      key,
      chips: filterValue[key].map((id) => {
        const sourceType = sourceTypes.find((type) => type.id === id);

        return { name: sourceType ? sourceType.product_name : id, value: id };
      }),
    }),
    applications: () => ({
      category: 'Application',
      key,
      chips: filterValue[key].map((id) => {
        const appType = appTypes.find((type) => type.id === id);

        return { name: appType ? appType.display_name : id, value: id };
      }),
    }),
    availability_status: () => ({
      category: 'Status',
      key,
      chips: [
        {
          value: filterValue[key][0],
          name:
            filterValue[key][0] === AVAILABLE
              ? intl.formatMessage({
                  id: 'sources.available',
                  defaultMessage: 'Available',
                })
              : intl.formatMessage({
                  id: 'sources.unavailable',
                  defaultMessage: 'Unavailable',
                }),
        },
      ],
    }),
  }[key] || (() => ({ name: key })));

export const prepareChips = (filterValue, sourceTypes, appTypes, intl) =>
  Object.keys(filterValue)
    .map((key) =>
      filterValue[key] && filterValue[key].length > 0
        ? chipsFormatters(key, filterValue, sourceTypes, appTypes, intl)()
        : undefined
    )
    .filter(Boolean);

export const removeChips = (chips, filterValue, deleteAll) => {
  if (deleteAll) {
    return Object.keys(filterValue).reduce(
      (acc, curr) => ({
        ...acc,
        [curr]: undefined,
      }),
      {}
    );
  }

  const chip = chips[0];

  return {
    ...filterValue,
    [chip.key]: chip.chips ? filterValue[chip.key].filter((value) => value !== chip.chips[0].value) : undefined,
  };
};

export const loadedTypes = (types, loaded) => (loaded && types.length > 0 ? types : undefined);

export const checkSubmit = (state, dispatch, push, intl) => {
  const id = `sources-wizard-notification-${Date.now()}`;

  if (location.pathname.split('/').filter(Boolean).pop() !== routes.sourcesNew.path.split('/').pop()) {
    if (state.isErrored) {
      dispatch(
        addMessage({
          title: intl.formatMessage(
            {
              id: 'alert.error.title',
              defaultMessage: 'Error adding source {name}',
            },
            { name: state.values.source.name }
          ),
          description: intl.formatMessage({
            id: 'alert.error.description',
            defaultMessage:
              'There was a problem while trying to add your source. Please try again. If the error persists, open a support case.',
          }),
          variant: 'danger',
          customId: id,
          actionLinks: (
            <AlertActionLink>
              {intl.formatMessage({
                id: 'alert.error.link',
                defaultMessage: 'Retry',
              })}
            </AlertActionLink>
          ),
        })
      );
    } else {
      switch (computeSourceStatus(state.createdSource)) {
        case 'unavailable':
          dispatch(
            addMessage({
              title: intl.formatMessage(
                {
                  id: 'alert.error.title',
                  defaultMessage: 'Source {name} configuration unsuccessful',
                },
                { name: state.createdSource.name }
              ),
              description:
                state.createdSource.applications?.[0]?.availability_status_error ||
                state.createdSource.endpoint?.[0]?.availability_status_error ||
                intl.formatMessage({
                  id: 'wizard.unknownError',
                  defaultMessage: 'Unknown error',
                }),
              variant: 'danger',
              customId: id,
              actionLinks: (
                <AlertActionLink
                  onClick={() => {
                    dispatch(removeMessage(id));
                    push(replaceRouteId(routes.sourcesDetail.path, state.createdSource.id));
                  }}
                >
                  {intl.formatMessage({
                    id: 'alert.unavailable.link',
                    defaultMessage: 'Edit source',
                  })}
                </AlertActionLink>
              ),
            })
          );
          break;
        case 'timeout':
          dispatch(
            addMessage({
              title: intl.formatMessage(
                {
                  id: 'alert.timeout.title',
                  defaultMessage: 'Source {name} configuration in progress',
                },
                { name: state.createdSource.name }
              ),
              description: intl.formatMessage({
                id: 'alert.timeout.description',
                defaultMessage:
                  'We are still working to confirm credentials and app settings. To track progress, check the Status column in the Sources table.',
              }),
              variant: 'info',
            })
          );
          break;
        default:
          dispatch(
            addMessage({
              title: intl.formatMessage(
                {
                  id: 'alert.success.title',
                  defaultMessage: 'Source {name} connection successful',
                },
                { name: state.createdSource.name }
              ),
              description: intl.formatMessage(
                {
                  id: 'alert.success.description',
                  defaultMessage: '{type} connection is established.',
                },
                { type: state.sourceTypes.find(({ id }) => id === state.createdSource.source_type_id)?.product_name }
              ),
              variant: 'success',
              customId: id,
              actionLinks: (
                <AlertActionLink
                  onClick={() => {
                    dispatch(removeMessage(id));
                    push(replaceRouteId(routes.sourcesDetail.path, state.createdSource.id));
                  }}
                >
                  {intl.formatMessage({
                    id: 'alert.success.link',
                    defaultMessage: 'View source details',
                  })}
                </AlertActionLink>
              ),
            })
          );
          break;
      }
    }
  }
};
