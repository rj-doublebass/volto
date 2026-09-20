import React, { createRef, useMemo } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import cx from 'classnames';
import { Pagination, Dimmer, Loader } from 'semantic-ui-react';
import Slugger from 'github-slugger';
import Icon from '@plone/volto/components/theme/Icon/Icon';
import { renderLinkElement } from '@plone/volto-slate/editor/render';
import config from '@plone/volto/registry';
import withQuerystringResults from './withQuerystringResults';
import { normalizeString } from '@plone/volto/helpers/Utils/Utils';

import paginationLeftSVG from '@plone/volto/icons/left-key.svg';
import paginationRightSVG from '@plone/volto/icons/right-key.svg';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable/Loadable';

const Headline = ({ headlineTag, id, data = {}, listingItems, isEditMode }) => {
  let attr = { id };
  const slug = Slugger.slug(normalizeString(data.headline));
  attr.id = slug || id;
  const LinkedHeadline = useMemo(
    () => renderLinkElement(headlineTag),
    [headlineTag],
  );
  return (
    <LinkedHeadline
      mode={!isEditMode && 'view'}
      children={data.headline}
      attributes={attr}
      className={cx('headline', {
        emptyListing: !listingItems?.length > 0,
      })}
    />
  );
};

const ListingBody = withQuerystringResults((props) => {
  const {
    data = {},
    isEditMode,
    listingItems,
    totalPages,
    onPaginationChange,
    variation,
    currentPage,
    prevBatch,
    nextBatch,
    isFolderContentsListing,
    hasLoaded,
    id,
    rrule,
  } = props;

  let ListingBodyTemplate;
  // Legacy support if template is present
  const variations = config.blocks?.blocksConfig['listing']?.variations || [];
  const defaultVariation = variations.filter((item) => item.isDefault)?.[0];

  if (data.template && !data.variation) {
    const legacyTemplateConfig = variations.find(
      (item) => item.id === data.template,
    );
    ListingBodyTemplate = legacyTemplateConfig.template;
  } else {
    ListingBodyTemplate =
      variation?.template ?? defaultVariation?.template ?? null;
  }

  const listingRef = createRef();

  const NoResults = variation?.noResultsComponent
    ? variation.noResultsComponent
    : config.blocks?.blocksConfig['listing'].noResultsComponent;

  const HeadlineTag = data.headlineTag || 'h2';

  if (variation?.id === 'event_card') {
    const { rrulestr } = rrule;

    const query = props.data.query;
    const sort_order = props.data.sort_order;
    const sort_on = props.data.sort_on;
    const today = new Date();

    listingItems.forEach((item, index) => {
      const recurrence = item.recurrence;
      const rule = recurrence ? rrulestr(recurrence, { unfold: true }) : null;

      const daterange = query?.reduce((acc, { o, v }) => o === "plone.app.querystring.operation.date.between" ? v : acc, undefined);
      let count = rule?.options.count;
      let upcoming: Date | undefined = rule?.after(today);

      if (daterange && (rule !== null)) {
        const m0 = new Date(daterange[0]);
        const m1 = new Date(daterange[1]);
        const nextDate = rule.after(m0);
        const range: Date[] = rule.between(m0, m1);
        upcoming = range.find((d: Date) => d.getTime() === nextDate.getTime()) ?? upcoming;
        count = range.length;
      };
      listingItems[index] = { ...item, upcoming, count };
    });

    if (sort_on === 'start') {
      listingItems.sort((a, b) => {
        const da = (a.upcoming ?? new Date(a.start)).getTime();
        const db = (b.upcoming ?? new Date(b.start)).getTime();
        return sort_order === 'ascending' ? (da < db ? -1 : da > db ? 1 : 0) : (da < db ? 1 : da > db ? -1 : 0);
      });
    }
  };

  return (
    <>
      {data.headline && (
        <Headline
          headlineTag={HeadlineTag}
          id={id}
          listingItems={listingItems}
          data={data}
          isEditMode={isEditMode}
        />
      )}
      {listingItems?.length > 0 ? (
        <div ref={listingRef}>
          <ListingBodyTemplate
            items={listingItems}
            isEditMode={isEditMode}
            {...data}
            {...variation}
          />
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <Pagination
                activePage={currentPage}
                totalPages={totalPages}
                onPageChange={(e, { activePage }) => {
                  !isEditMode &&
                    listingRef.current.scrollIntoView({ behavior: 'smooth' });
                  onPaginationChange(e, { activePage });
                }}
                firstItem={null}
                lastItem={null}
                prevItem={{
                  content: <Icon name={paginationLeftSVG} size="18px" />,
                  icon: true,
                  'aria-disabled': !prevBatch,
                  className: !prevBatch ? 'disabled' : null,
                }}
                nextItem={{
                  content: <Icon name={paginationRightSVG} size="18px" />,
                  icon: true,
                  'aria-disabled': !nextBatch,
                  className: !nextBatch ? 'disabled' : null,
                }}
              />
            </div>
          )}
        </div>
      ) : isEditMode ? (
        <div className="listing message" ref={listingRef}>
          {isFolderContentsListing && (
            <FormattedMessage
              id="No items found in this container."
              defaultMessage="No items found in this container."
            />
          )}
          {hasLoaded && NoResults && (
            <NoResults isEditMode={isEditMode} {...data} />
          )}
          <Dimmer active={!hasLoaded} inverted>
            <Loader indeterminate size="small">
              <FormattedMessage id="loading" defaultMessage="Loading" />
            </Loader>
          </Dimmer>
        </div>
      ) : (
        <div className="emptyListing">
          {hasLoaded && NoResults && (
            <NoResults isEditMode={isEditMode} {...data} />
          )}
          <Dimmer active={!hasLoaded} inverted>
            <Loader indeterminate size="small">
              <FormattedMessage id="loading" defaultMessage="Loading" />
            </Loader>
          </Dimmer>
        </div>
      )}
    </>
  );
});

export default injectIntl(injectLazyLibs(['moment', 'rrule'])(ListingBody));
