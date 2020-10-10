/**
 * External dependencies
 */
import React from 'react';
import styled from '@emotion/styled';
import debugFactory from 'debug';
import { sprintf } from '@wordpress/i18n';
import { useI18n } from '@automattic/react-i18n';

/**
 * Internal dependencies
 */
import Field from '../../components/field';
import Button from '../../components/button';
import { FormStatus, useLineItems, useEvents } from '../../public-api';
import { useFormStatus } from '../form-status';
import { SummaryLine, SummaryDetails } from '../styled-components/summary-details';
import { registerStore, useSelect, useDispatch } from '../../lib/registry';
import { PaymentMethodLogos } from '../styled-components/payment-method-logos';

const debug = debugFactory( 'composite-checkout:bancontact-payment-method' );

export function createBancontactPaymentMethodStore() {
	debug( 'creating a new bancontact payment method store' );
	const actions = {
		changeCustomerName( payload ) {
			return { type: 'CUSTOMER_NAME_SET', payload };
		},
	};

	const selectors = {
		getCustomerName( state ) {
			return state.customerName || '';
		},
	};

	const store = registerStore( 'bancontact', {
		reducer(
			state = {
				customerName: { value: '', isTouched: false },
			},
			action
		) {
			switch ( action.type ) {
				case 'CUSTOMER_NAME_SET':
					return { ...state, customerName: { value: action.payload, isTouched: true } };
			}
			return state;
		},
		actions,
		selectors,
	} );

	return { ...store, actions, selectors };
}

export function createBancontactMethod( { store, stripe, stripeConfiguration } ) {
	return {
		id: 'bancontact',
		label: <BancontactLabel />,
		activeContent: (
			<BancontactFields stripe={ stripe } stripeConfiguration={ stripeConfiguration } />
		),
		inactiveContent: <BancontactSummary />,
		submitButton: (
			<BancontactPayButton
				store={ store }
				stripe={ stripe }
				stripeConfiguration={ stripeConfiguration }
			/>
		),
		getAriaLabel: ( __ ) => __( 'Bancontact' ),
	};
}

function BancontactFields() {
	const { __ } = useI18n();

	const customerName = useSelect( ( select ) => select( 'bancontact' ).getCustomerName() );
	const { changeCustomerName } = useDispatch( 'bancontact' );
	const { formStatus } = useFormStatus();
	const isDisabled = formStatus !== FormStatus.READY;

	return (
		<BancontactFormWrapper>
			<BancontactField
				id="bancontact-cardholder-name"
				type="Text"
				autoComplete="cc-name"
				label={ __( 'Your name' ) }
				value={ customerName?.value ?? '' }
				onChange={ changeCustomerName }
				isError={ customerName?.isTouched && customerName?.value.length === 0 }
				errorMessage={ __( 'This field is required' ) }
				disabled={ isDisabled }
			/>
		</BancontactFormWrapper>
	);
}

const BancontactFormWrapper = styled.div`
	padding: 16px;
	position: relative;

	::after {
		display: block;
		width: calc( 100% - 6px );
		height: 1px;
		content: '';
		background: ${ ( props ) => props.theme.colors.borderColorLight };
		position: absolute;
		top: 0;
		left: 3px;

		.rtl & {
			right: 3px;
			left: auto;
		}
	}
`;

const BancontactField = styled( Field )`
	margin-top: 16px;

	:first-of-type {
		margin-top: 0;
	}
`;

function BancontactPayButton( { disabled, onClick, store, stripe, stripeConfiguration } ) {
	const [ items, total ] = useLineItems();
	const { formStatus } = useFormStatus();
	const onEvent = useEvents();
	const customerName = useSelect( ( select ) => select( 'bancontact' ).getCustomerName() );

	return (
		<Button
			disabled={ disabled }
			onClick={ () => {
				if ( isFormValid( store ) ) {
					debug( 'submitting bancontact payment' );
					onEvent( {
						type: 'REDIRECT_TRANSACTION_BEGIN',
						payload: { paymentMethodId: 'bancontact' },
					} );
					onClick( 'bancontact', {
						stripe,
						name: customerName?.value,
						items,
						total,
						stripeConfiguration,
					} );
				}
			} }
			buttonType="primary"
			isBusy={ FormStatus.SUBMITTING === formStatus }
			fullWidth
		>
			<ButtonContents formStatus={ formStatus } total={ total } />
		</Button>
	);
}

function ButtonContents( { formStatus, total } ) {
	const { __ } = useI18n();
	if ( formStatus === FormStatus.SUBMITTING ) {
		return __( 'Processing…' );
	}
	if ( formStatus === FormStatus.READY ) {
		return sprintf( __( 'Pay %s' ), total.amount.displayValue );
	}
	return __( 'Please wait…' );
}

function isFormValid( store ) {
	const customerName = store.selectors.getCustomerName( store.getState() );

	if ( ! customerName?.value.length ) {
		// Touch the field so it displays a validation error
		store.dispatch( store.actions.changeCustomerName( '' ) );
		return false;
	}
	return true;
}

function BancontactLabel() {
	return (
		<React.Fragment>
			<span>Bancontact</span>
			<PaymentMethodLogos className="bancontact__logo payment-logos">
				<BancontactLogo />
			</PaymentMethodLogos>
		</React.Fragment>
	);
}

function BancontactLogo() {
	return (
		<svg width="99" height="16" viewBox="0 0 99 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M26.8965 4.89651H25.4872H18.9661H17.5568L16.6013 5.99774L13.5199 9.55836L12.5645 10.6596H11.1551H4.75348H3.34415L4.27574 9.54613L4.71765 9.01998L5.64923 7.90653H4.23991H2.42451H1.40932C0.633 7.90653 0 8.5795 0 9.38706V12.2502V12.5194C0 13.3392 0.633 14 1.40932 14H1.80345H16.6133H17.6762C18.4526 14 19.5155 13.4983 20.0291 12.8987L22.4894 10.0356L26.8965 4.89651Z"
				fill="#004E91"
			/>
			<path
				d="M28.8193 2.01168C29.5836 2.01168 30.2069 2.65406 30.2069 3.42492V6.41491C30.2069 7.19744 29.5836 7.82814 28.8193 7.82814H28.0666H26.0322H24.6446L25.5736 6.77697L26.0322 6.25139L26.9612 5.20022H17.7652L12.8614 10.6897H3.72415L10.2743 3.33148L10.5212 3.05117C11.0387 2.47887 12.0853 2 12.8496 2H13.1672H28.8193V2.01168Z"
				fill="#FFDD00"
			/>
			<path
				d="M98.1466 13.6766V12.7563C98.1466 12.632 98.0719 12.5573 97.8977 12.5573H97.3003C97.1261 12.5573 97.0016 12.5325 96.9767 12.4578C96.927 12.3832 96.927 12.234 96.927 11.9853V8.50307H97.8977C97.9723 8.50307 98.0221 8.4782 98.0719 8.42845C98.1217 8.37871 98.1466 8.32896 98.1466 8.25434V7.2843C98.1466 7.20968 98.1217 7.15994 98.0719 7.11019C98.0221 7.06045 97.9723 7.03557 97.8977 7.03557H96.927V5.76706C96.927 5.69244 96.9021 5.6427 96.8772 5.61782C96.8274 5.59295 96.7776 5.56808 96.7278 5.56808H96.7029L95.2593 5.81681C95.1847 5.84168 95.1349 5.86655 95.0851 5.89143C95.0353 5.94117 95.0104 5.99092 95.0104 6.04066V7.0107H94.0397C93.9651 7.0107 93.9153 7.03557 93.8655 7.08532C93.8157 7.13507 93.7908 7.18481 93.7908 7.25943V8.05536C93.7908 8.12998 93.8157 8.17972 93.8655 8.2046C93.9153 8.25434 93.9651 8.27922 94.0397 8.30409L95.0104 8.45332V11.9355C95.0104 12.3584 95.0602 12.7066 95.1349 12.9802C95.2344 13.2538 95.3589 13.4528 95.5082 13.602C95.6825 13.7512 95.8816 13.8507 96.1305 13.9005C96.3794 13.9502 96.6781 13.9751 97.0016 13.9751C97.1758 13.9751 97.3252 13.9751 97.4745 13.9502C97.599 13.9253 97.7732 13.9005 97.9474 13.8756C98.0719 13.8756 98.1466 13.801 98.1466 13.6766ZM92.9695 13.5523V12.4827C92.9695 12.4081 92.9446 12.3584 92.8948 12.3335C92.845 12.3086 92.7952 12.2837 92.7455 12.2837H92.7206C92.4966 12.3086 92.2726 12.3335 92.0734 12.3335C91.8743 12.3584 91.6005 12.3584 91.2521 12.3584C91.1276 12.3584 90.9783 12.3335 90.8787 12.2837C90.7543 12.234 90.6547 12.1594 90.5552 12.0599C90.4556 11.9604 90.4058 11.8112 90.356 11.637C90.3063 11.4629 90.2814 11.2391 90.2814 10.9655V9.97057C90.2814 9.69697 90.3063 9.47311 90.356 9.299C90.4058 9.12489 90.4805 8.97566 90.5552 8.87617C90.6547 8.77667 90.7543 8.70205 90.8787 8.65231C91.0032 8.60256 91.1276 8.57769 91.2521 8.57769C91.6005 8.57769 91.8743 8.57769 92.0734 8.60256C92.2726 8.62744 92.4966 8.62743 92.7206 8.65231H92.7455C92.8201 8.65231 92.8699 8.62744 92.8948 8.60256C92.9446 8.57769 92.9695 8.52794 92.9695 8.45332V7.3838C92.9695 7.28431 92.9446 7.23456 92.9197 7.20968C92.8699 7.18481 92.8201 7.13507 92.7206 7.11019C92.5463 7.06045 92.3472 7.03558 92.0734 6.98583C91.7997 6.93608 91.501 6.93608 91.1276 6.93608C90.2814 6.93608 89.6093 7.18481 89.0867 7.70714C88.5889 8.22947 88.3151 8.97565 88.3151 9.97057V10.9655C88.3151 11.9355 88.564 12.7066 89.0867 13.2289C89.5845 13.7512 90.2814 14 91.1276 14C91.4761 14 91.7997 13.9751 92.0734 13.9502C92.3472 13.9005 92.5712 13.8756 92.7206 13.8259C92.8201 13.801 92.8699 13.7761 92.9197 13.7264C92.9695 13.7015 92.9695 13.6269 92.9695 13.5523ZM85.179 12.2837C85.0296 12.3584 84.8803 12.4081 84.7061 12.4578C84.5318 12.5076 84.3576 12.5325 84.1834 12.5325C83.9345 12.5325 83.7354 12.5076 83.6109 12.433C83.4865 12.3584 83.4367 12.2091 83.4367 11.9355V11.836C83.4367 11.6868 83.4616 11.5624 83.4865 11.4629C83.5113 11.3634 83.586 11.264 83.6607 11.1893C83.7354 11.1147 83.8598 11.065 83.9843 11.0152C84.1087 10.9904 84.2829 10.9655 84.5069 10.9655H85.179V12.2837V12.2837ZM87.0706 9.37362C87.0706 8.92591 86.9959 8.55282 86.8715 8.25434C86.747 7.95587 86.5479 7.70714 86.3239 7.50816C86.075 7.30918 85.8012 7.15994 85.4527 7.08532C85.1043 6.98583 84.7061 6.93608 84.2829 6.93608C83.8847 6.93608 83.4865 6.96096 83.1131 7.0107C82.7398 7.06045 82.4411 7.11019 82.2171 7.18481C82.0677 7.23456 81.9931 7.30917 81.9931 7.45841V8.42845C81.9931 8.50307 82.018 8.55282 82.0428 8.60256C82.0926 8.62744 82.1424 8.65231 82.1922 8.65231H82.242C82.3415 8.65231 82.466 8.62744 82.5904 8.62744C82.7398 8.62744 82.8891 8.60256 83.0633 8.60256C83.2376 8.60256 83.4367 8.57769 83.6358 8.57769C83.8349 8.57769 84.034 8.57769 84.2083 8.57769C84.482 8.57769 84.7061 8.62744 84.8554 8.72693C85.0047 8.82642 85.1043 9.05027 85.1043 9.39849V9.82133H84.4572C83.4367 9.82133 82.6651 9.97057 82.2171 10.2939C81.7442 10.6173 81.5202 11.1396 81.5202 11.836V11.9355C81.5202 12.3335 81.5699 12.6568 81.6944 12.9056C81.8188 13.1792 81.9682 13.3781 82.1673 13.5523C82.3664 13.7015 82.5655 13.8259 82.8144 13.9005C83.0633 13.9751 83.3122 14 83.586 14C83.9345 14 84.258 13.9502 84.5069 13.8507C84.7558 13.7512 85.0047 13.6269 85.2536 13.4528V13.6517C85.2536 13.7264 85.2785 13.7761 85.3283 13.8259C85.3781 13.8756 85.4279 13.9005 85.5025 13.9005H86.8466C86.9213 13.9005 86.971 13.8756 87.0208 13.8259C87.0706 13.7761 87.0955 13.7264 87.0955 13.6517V9.37362H87.0706ZM80.6739 13.6766V12.7563C80.6739 12.632 80.5992 12.5573 80.425 12.5573H79.8525C79.6783 12.5573 79.5539 12.5325 79.529 12.4578C79.4792 12.3832 79.4792 12.234 79.4792 11.9853V8.50307H80.4499C80.5246 8.50307 80.5743 8.4782 80.6241 8.42845C80.6739 8.37871 80.6988 8.32896 80.6988 8.25434V7.2843C80.6988 7.20968 80.6739 7.15994 80.6241 7.11019C80.5743 7.06045 80.5246 7.03557 80.4499 7.03557H79.4792V5.76706C79.4792 5.69244 79.4543 5.6427 79.4294 5.61782C79.3796 5.59295 79.3299 5.56808 79.2801 5.56808H79.2552L77.8116 5.81681C77.7369 5.84168 77.6871 5.86655 77.6374 5.89143C77.5876 5.94117 77.5627 5.99092 77.5627 6.04066V7.0107H76.592C76.5173 7.0107 76.4675 7.03557 76.4177 7.08532C76.368 7.13507 76.3431 7.18481 76.3431 7.25943V8.05536C76.3431 8.12998 76.368 8.17972 76.4177 8.2046C76.4675 8.25434 76.5173 8.27922 76.592 8.30409L77.5627 8.45332V11.9355C77.5627 12.3584 77.6125 12.7066 77.6871 12.9802C77.7867 13.2538 77.9111 13.4528 78.0605 13.602C78.2098 13.7512 78.4338 13.8507 78.6827 13.9005C78.9316 13.9502 79.2303 13.9751 79.5539 13.9751C79.7281 13.9751 79.8774 13.9751 80.0268 13.9502C80.1512 13.9253 80.3255 13.9005 80.4997 13.8756C80.5992 13.8756 80.6739 13.801 80.6739 13.6766ZM75.447 13.6517V9.67209C75.447 9.299 75.4222 8.95078 75.3475 8.60256C75.2977 8.27922 75.1733 7.98074 75.0239 7.73201C74.8746 7.48329 74.6506 7.2843 74.3768 7.15994C74.103 7.0107 73.7545 6.93608 73.3065 6.93608C72.9332 6.93608 72.5847 6.98583 72.286 7.08532C71.9874 7.18481 71.6887 7.33405 71.3402 7.58278V7.2843C71.3402 7.20968 71.3153 7.15994 71.2656 7.11019C71.2158 7.06045 71.166 7.03557 71.0913 7.03557H69.7473C69.6726 7.03557 69.6228 7.06045 69.573 7.11019C69.5233 7.15994 69.4984 7.20968 69.4984 7.2843V13.6517C69.4984 13.7264 69.5233 13.7761 69.573 13.8259C69.6228 13.8756 69.6726 13.9005 69.7473 13.9005H71.1909C71.2656 13.9005 71.3153 13.8756 71.3651 13.8259C71.4149 13.7761 71.4398 13.7264 71.4398 13.6517V8.95078C71.6389 8.85129 71.838 8.7518 72.0371 8.67718C72.2114 8.60256 72.4105 8.57769 72.5847 8.57769C72.7589 8.57769 72.9083 8.60256 73.0327 8.62744C73.1572 8.65231 73.2319 8.72693 73.3065 8.80155C73.3812 8.90104 73.4061 9.00053 73.431 9.14976C73.4559 9.299 73.4559 9.47311 73.4559 9.67209V13.6517C73.4559 13.7264 73.4808 13.7761 73.5305 13.8259C73.5803 13.8756 73.6301 13.9005 73.7048 13.9005H75.1484C75.223 13.9005 75.2728 13.8756 75.3226 13.8259C75.4222 13.7761 75.447 13.7015 75.447 13.6517ZM66.3872 10.8909C66.3872 11.8609 66.0387 12.3584 65.3169 12.3584C64.9684 12.3584 64.6946 12.234 64.5204 11.9853C64.3462 11.7365 64.2466 11.3634 64.2466 10.8909V10.0452C64.2466 9.54773 64.3462 9.19951 64.5204 8.95078C64.6946 8.70205 64.9684 8.57769 65.3169 8.57769C66.0138 8.57769 66.3872 9.07515 66.3872 10.0452V10.8909ZM68.3286 10.0452C68.3286 9.5726 68.2539 9.12489 68.1294 8.7518C68.005 8.37871 67.8059 8.05536 67.557 7.78176C67.3081 7.50816 66.9845 7.30918 66.6112 7.15994C66.2378 7.0107 65.8147 6.93608 65.3169 6.93608C64.8191 6.93608 64.396 7.0107 64.0226 7.15994C63.6493 7.30918 63.3257 7.50816 63.0768 7.78176C62.8279 8.05536 62.6288 8.37871 62.5043 8.7518C62.3799 9.12489 62.3052 9.5726 62.3052 10.0452V10.8909C62.3052 11.3634 62.3799 11.8112 62.5043 12.1842C62.6288 12.5573 62.8279 12.8807 63.0768 13.1543C63.3257 13.4279 63.6493 13.6269 64.0226 13.7761C64.396 13.9253 64.8191 14 65.3169 14C65.8147 14 66.2378 13.9253 66.6112 13.7761C66.9845 13.6269 67.3081 13.4279 67.557 13.1543C67.8059 12.8807 68.005 12.5573 68.1294 12.1842C68.2539 11.8112 68.3286 11.3634 68.3286 10.8909V10.0452ZM61.6581 13.5523V12.4827C61.6581 12.4081 61.6332 12.3584 61.5834 12.3335C61.5336 12.3086 61.4839 12.2837 61.4092 12.2837H61.3843C61.1603 12.3086 60.9363 12.3335 60.7372 12.3335C60.538 12.3335 60.2643 12.3584 59.9158 12.3584C59.7914 12.3584 59.642 12.3335 59.5425 12.2837C59.418 12.234 59.3184 12.1594 59.2189 12.0599C59.1193 11.9604 59.0695 11.8112 59.0198 11.637C58.97 11.4629 58.9451 11.2391 58.9451 10.9655V9.97057C58.9451 9.69697 58.97 9.47311 59.0198 9.299C59.0695 9.12489 59.1442 8.97566 59.2189 8.87617C59.3184 8.77667 59.418 8.70205 59.5425 8.65231C59.6669 8.60256 59.7914 8.57769 59.9158 8.57769C60.2643 8.57769 60.538 8.57769 60.7372 8.60256C60.9363 8.62744 61.1603 8.62743 61.3843 8.65231H61.4092C61.4839 8.65231 61.5336 8.62744 61.5834 8.60256C61.6332 8.57769 61.6581 8.52794 61.6581 8.45332V7.3838C61.6581 7.28431 61.6332 7.23456 61.6083 7.20968C61.5585 7.18481 61.5087 7.13507 61.4092 7.11019C61.235 7.06045 61.0358 7.03558 60.7621 6.98583C60.4883 6.93608 60.1896 6.93608 59.8162 6.93608C58.97 6.93608 58.298 7.18481 57.7753 7.70714C57.2775 8.22947 57.0037 8.97565 57.0037 9.97057V10.9655C57.0037 11.9355 57.2526 12.7066 57.7753 13.2289C58.2731 13.7512 58.97 14 59.8162 14C60.1647 14 60.4883 13.9751 60.7621 13.9502C61.0358 13.9005 61.235 13.8756 61.4092 13.8259C61.5087 13.801 61.5585 13.7761 61.6083 13.7264C61.6581 13.7015 61.6581 13.6269 61.6581 13.5523ZM55.7841 13.6517V9.67209C55.7841 9.299 55.7592 8.95078 55.6845 8.60256C55.6348 8.27922 55.5103 7.98074 55.361 7.73201C55.2116 7.48329 54.9876 7.2843 54.7138 7.15994C54.44 7.0107 54.0916 6.93608 53.6436 6.93608C53.2702 6.93608 52.9218 6.98583 52.6231 7.08532C52.3244 7.18481 52.0257 7.33405 51.6773 7.58278V7.2843C51.6773 7.20968 51.6524 7.15994 51.6026 7.11019C51.5528 7.06045 51.503 7.03557 51.4284 7.03557H50.0843C50.0097 7.03557 49.9599 7.06045 49.9101 7.11019C49.8603 7.15994 49.8354 7.20968 49.8354 7.2843V13.6517C49.8354 13.7264 49.8603 13.7761 49.9101 13.8259C49.9599 13.8756 50.0097 13.9005 50.0843 13.9005H51.5279C51.6026 13.9005 51.6524 13.8756 51.7022 13.8259C51.7519 13.7761 51.7768 13.7264 51.7768 13.6517V8.95078C51.976 8.85129 52.1751 8.7518 52.3742 8.67718C52.5484 8.60256 52.7475 8.57769 52.9218 8.57769C53.096 8.57769 53.2453 8.60256 53.3698 8.62744C53.4942 8.65231 53.5689 8.72693 53.6436 8.80155C53.7182 8.90104 53.7431 9.00053 53.768 9.14976C53.7929 9.299 53.7929 9.47311 53.7929 9.67209V13.6517C53.7929 13.7264 53.8178 13.7761 53.8676 13.8259C53.9174 13.8756 53.9671 13.9005 54.0418 13.9005H55.4854C55.5601 13.9005 55.6099 13.8756 55.6596 13.8259C55.7343 13.7761 55.7841 13.7015 55.7841 13.6517ZM46.5251 12.2837C46.3757 12.3584 46.2264 12.4081 46.0522 12.4578C45.8779 12.5076 45.7037 12.5325 45.5295 12.5325C45.2806 12.5325 45.0815 12.5076 44.957 12.433C44.8326 12.3584 44.7828 12.2091 44.7828 11.9355V11.836C44.7828 11.6868 44.8077 11.5624 44.8326 11.4629C44.8575 11.3634 44.9321 11.264 45.0068 11.1893C45.0815 11.1147 45.2059 11.065 45.3304 11.0152C45.4548 10.9904 45.6291 10.9655 45.8531 10.9655H46.5251V12.2837ZM48.4416 9.37362C48.4416 8.92591 48.3669 8.55282 48.2425 8.25434C48.118 7.95587 47.9189 7.70714 47.6949 7.50816C47.446 7.30918 47.1722 7.15994 46.8238 7.08532C46.4753 6.98583 46.0771 6.93608 45.6539 6.93608C45.2557 6.93608 44.8575 6.96096 44.4841 7.0107C44.1108 7.06045 43.8121 7.11019 43.5881 7.18481C43.4387 7.23456 43.3641 7.30917 43.3641 7.45841V8.42845C43.3641 8.50307 43.389 8.55282 43.4139 8.60256C43.4636 8.62744 43.5134 8.65231 43.5632 8.65231H43.613C43.7125 8.65231 43.837 8.62744 43.9614 8.62744C44.1108 8.62744 44.2601 8.60256 44.4592 8.60256C44.6335 8.60256 44.8326 8.57769 45.0317 8.57769C45.2308 8.57769 45.4299 8.57769 45.6042 8.57769C45.878 8.57769 46.102 8.62744 46.2513 8.72693C46.4006 8.82642 46.5002 9.05027 46.5002 9.39849V9.82133H45.8531C44.8326 9.82133 44.061 9.97057 43.613 10.2939C43.165 10.6173 42.9161 11.1396 42.9161 11.836V11.9355C42.9161 12.3335 42.9658 12.6568 43.0903 12.9056C43.2147 13.1792 43.3641 13.3781 43.5632 13.5523C43.7623 13.7015 43.9614 13.8259 44.2103 13.9005C44.4592 13.9751 44.7081 14 44.9819 14C45.3304 14 45.6539 13.9502 45.9028 13.8507C46.1517 13.7512 46.4006 13.6269 46.6495 13.4528V13.6517C46.6495 13.7264 46.6744 13.7761 46.7242 13.8259C46.774 13.8756 46.8238 13.9005 46.8984 13.9005H48.2425C48.3172 13.9005 48.3669 13.8756 48.4167 13.8259C48.4665 13.7761 48.4914 13.7264 48.4914 13.6517V9.37362H48.4416ZM39.8795 11.264C39.8795 11.5873 39.7551 11.8609 39.531 12.035C39.307 12.2091 38.859 12.3086 38.2617 12.3086H38.0625C37.963 12.3086 37.8634 12.3086 37.7639 12.3086C37.6643 12.3086 37.5648 12.3086 37.4652 12.3086H37.2661V10.0701H38.6101C39.083 10.0701 39.4315 10.1695 39.6057 10.3934C39.7799 10.6173 39.8795 10.866 39.8795 11.1396V11.264ZM39.8297 7.70714C39.8297 7.8315 39.8048 7.95587 39.7799 8.08023C39.7302 8.2046 39.6804 8.30409 39.5808 8.37871C39.4813 8.45333 39.3568 8.52794 39.2075 8.57769C39.0581 8.62743 38.859 8.65231 38.6101 8.65231H37.2661V6.58786C37.3159 6.58786 37.3656 6.58786 37.4403 6.58786C37.515 6.58786 37.6145 6.58786 37.7141 6.58786H37.9879H38.187C38.8092 6.58786 39.2324 6.66248 39.4813 6.81172C39.7302 6.96096 39.8546 7.20968 39.8546 7.53303V7.70714H39.8297ZM41.8707 11.1396C41.8707 10.7168 41.7711 10.3685 41.572 10.0701C41.3729 9.77158 41.124 9.52286 40.8004 9.37362C41.124 9.22438 41.3729 8.97566 41.5471 8.67718C41.7214 8.35384 41.8209 8.00562 41.8209 7.63252V7.40867C41.8209 6.93608 41.7214 6.53812 41.5471 6.21477C41.3729 5.89142 41.0991 5.6427 40.7755 5.44372C40.452 5.24473 40.0537 5.12037 39.5808 5.02088C39.1079 4.94626 38.6101 4.89651 38.0377 4.89651C37.8385 4.89651 37.6394 4.89651 37.4403 4.89651C37.2412 4.89651 37.0421 4.92139 36.8429 4.92139C36.6438 4.92139 36.4696 4.94626 36.2954 4.97113C36.1211 4.996 35.9967 4.99601 35.8971 5.02088C35.6731 5.07062 35.4989 5.12037 35.3993 5.24473C35.2998 5.34422 35.25 5.54321 35.25 5.81681V13.0797C35.25 13.3533 35.2998 13.5274 35.3993 13.6517C35.4989 13.7512 35.6731 13.8259 35.8971 13.8756C36.0216 13.9005 36.1709 13.9253 36.3203 13.9253C36.4945 13.9502 36.6687 13.9502 36.8678 13.9751C37.067 13.9751 37.2661 14 37.4652 14C37.6643 14 37.8883 14 38.0874 14C38.6101 14 39.1079 13.9502 39.5559 13.8756C40.004 13.801 40.4271 13.6517 40.7506 13.4528C41.0991 13.2538 41.348 12.9802 41.572 12.632C41.7711 12.2837 41.8707 11.836 41.8707 11.3137V11.1396V11.1396Z"
				fill="#004E91"
			/>
		</svg>
	);
}

function BancontactSummary() {
	const customerName = useSelect( ( select ) => select( 'bancontact' ).getCustomerName() );

	return (
		<SummaryDetails>
			<SummaryLine>{ customerName?.value }</SummaryLine>
		</SummaryDetails>
	);
}
