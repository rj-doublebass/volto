import React from 'react';
import { useIntl, defineMessages } from 'react-intl';
import PropTypes from 'prop-types';
import { List, ListItem } from 'semantic-ui-react';
import cx from 'classnames';

import { toBackendLang } from '@plone/volto/helpers/Utils/Utils';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable/Loadable';
import { useSelector } from 'react-redux';

const messages = defineMessages({
  fromTime: {
    id: 'event-from-time',
    defaultMessage: '{startDate} from {startTime}',
  },
  fromToTime: {
    id: 'event-from-to-time',
    defaultMessage: '{startDate} from {startTime} to {endTime}',
  },
  toDate: {
    id: 'event-to-date',
    defaultMessage: ' to {endDate}',
  },
});

export const datesForDisplay = (start, end, moment) => {
  const mStart = moment(start);
  const mEnd = moment(end);
  if (!mStart.isValid() || !mEnd.isValid()) {
    return null;
  }
  const sameDay = mStart.isSame(mEnd, 'day');
  const sameTime = mStart.isSame(mEnd, 'minute');
  return {
    sameDay,
    sameTime,
    mStart,
    mEnd,
    startDate: mStart.format('ll'),
    startTime: mStart.format('LT'),
    endDate: mEnd.format('ll'),
    endTime: mEnd.format('LT'),
  };
};

const When_ = ({ start, end, whole_day, open_end, moment: momentlib, recurrence, rrule }) => {
  const lang = useSelector((state) => state.intl.locale);
  const intl = useIntl();

  const moment = momentlib.default;
  moment.locale(toBackendLang(lang));

  const datesInfo = datesForDisplay(start, end, moment);
  if (!datesInfo) {
    return;
  }
  const { rrulestr } = rrule;
  const today = new Date();
  const rule = recurrence ? rrulestr(recurrence, { unfold: true, forceset: true }) : null;
  const upcoming = rule?.after(today);
  const startDate = (recurrence && upcoming) ? moment(upcoming).format('ll') : datesInfo.startDate;
  // TODO I18N INTL
  return (
    <p
      className={cx('event-when', {
        'same-day': datesInfo.sameDay,
        'same-time': datesInfo.sameTime,
        'whole-day': whole_day,
        'open-end': open_end,
      })}
    >
      {!datesInfo.sameDay ? (
        <>
          <span className="start">
            <span className="start-date">{datesInfo.startDate}</span>
            {!whole_day && (
              <>
                {/* Plone has an optional word based on locale here */}
                <span> </span>
                <span className="start-time">{datesInfo.startTime}</span>
              </>
            )}
          </span>
          {!open_end && (
            <>{intl.formatMessage(messages.toDate, {
              endDate: (
                <span className="end">
                  <span className="end-date">{datesInfo.endDate}</span>
                  {!whole_day && (
                    <>
                      {/* Plone has an optional word based on locale here */}
                      <span> </span>
                      <span className="end-time">{datesInfo.endTime}</span>
                    </>
                  )}
                </span>
              ),
            })}</>
          )}
        </>
      ) : (
        <>
          {whole_day && (
            <span className="start-date">{startDate}</span>
          )}
          {open_end && !whole_day && (
            <>{intl.formatMessage(messages.fromTime, {
              startDate: <span className="start-date">{startDate}</span>,
              startTime: <span className="start-time">{datesInfo.startTime}</span>,
            })}</>
          )}
          {!(whole_day || open_end) && (
            <>{intl.formatMessage(messages.fromToTime, {
              startDate: <span className="start-date">{startDate}</span>,
              startTime: <span className="start-time">{datesInfo.startTime}</span>,
              endTime: <span className="end-time">{datesInfo.endTime}</span>,
            })}</>
          )}
        </>
      )}
    </p>
  );
};

export const When = injectLazyLibs(['moment', 'rrule'])(When_);

When.propTypes = {
  start: PropTypes.string.isRequired,
  end: PropTypes.string,
  whole_day: PropTypes.bool,
  open_end: PropTypes.bool,
};

export const Recurrence_ = ({
  recurrence,
  start,
  moment: momentlib,
  rrule,
  end,
}) => {
  const moment = momentlib.default;
  const now = new Date();
  const { RRule, rrulestr } = rrule;
  if (recurrence.indexOf('DTSTART') < 0) {
    var dtstart = RRule.optionsToString({
      dtstart: new Date(start),
    });
    recurrence = dtstart + '\n' + recurrence;
  }
  const rule = rrulestr(recurrence, { unfold: true, forceset: true });

  const isNow = (date) => {
    if (!date) {
      return false;
    }
    const n = moment(now);
    const s = moment(date.startTime, 'LT');
    const e = moment(new Date(end));
    return date.sameDay && n.isBetween(s, e);
  };

  const setDateClass = (date) => {
    return {
      ...date,
      className: cx({
        'past-date': !date.sameDay && moment(now).isAfter(date.mStart),
        'is-today': date.sameDay,
        'is-now': isNow(date),
      }),
    };
  };

  return (
    <List>
      {rule
        .all()
        .map((date) => datesForDisplay(date, undefined, moment))
        .map(setDateClass)
        .map((date, index) => <ListItem key={index} className={date.className}>{date.startDate}</ListItem>)
      }
    </List>
  );
};
export const Recurrence = injectLazyLibs(['moment', 'rrule'])(Recurrence_);

Recurrence.propTypes = {
  recurrence: PropTypes.string.isRequired,
  start: PropTypes.string.isRequired,
  end: PropTypes.string,
};
