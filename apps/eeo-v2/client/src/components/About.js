import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faHeadset, faUsers, faCode, faHeart } from '@fortawesome/free-solid-svg-icons';

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`;

const DialogContainer = styled.div`
  max-width: 1100px;
  width: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideIn 0.4s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  padding: 1.5rem 2rem;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  margin: 0.4rem 0 0 0;
  font-size: 0.95rem;
  opacity: 0.95;
  font-weight: 400;
`;

const Content = styled.div`
  padding: 1.5rem 2rem;
`;

const Section = styled.section`
  margin-bottom: 1.75rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 2px solid #22c55e;
`;

const SectionIcon = styled.div`
  color: #22c55e;
  font-size: 1.3rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: #1e293b;
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 0;
  overflow: hidden;

  &:hover {
    background: #f1f5f9;
  }
`;

const ContactIcon = styled.div`
  color: #22c55e;
  font-size: 1.25rem;
  min-width: 24px;
  text-align: center;
`;

const ContactInfo = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const ContactLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const ContactValue = styled.div`
  font-size: 1rem;
  color: #1e293b;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TeamList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ContactRow = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const TeamMember = styled.div`
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const MemberHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
  gap: 0.75rem;
`;

const MemberNameBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const MemberName = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const MemberRole = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const MemberPhone = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const MemberEmail = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  
  &:hover {
    background: #fafbfc;
  }
`;

const Footer = styled.div`
  padding: 1.25rem 2rem;
  background: #f8fafc;
  text-align: center;
  border-top: 1px solid #e2e8f0;
`;

const FooterText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const HeartIcon = styled.span`
  color: #ef4444;
  font-size: 1rem;
`;

const About = () => {
  return (
    <PageWrapper>
      <DialogContainer>
        <Header>
          <Title>O aplikaci</Title>
          <Subtitle>
            Systém správy a workflow objednávek
            <span style={{ marginLeft: '0.5rem', fontSize: '0.85em', opacity: 0.9 }}>
              verze {process.env.REACT_APP_BUILD_VERSION?.match(/(\d+\.\d+[a-z]?)/)?.[1] || 'N/A'}
            </span>
          </Subtitle>
        </Header>

        <Content>
          {/* Sekce Support */}
          <Section>
            <SectionHeader>
              <SectionIcon>
                <FontAwesomeIcon icon={faHeadset} />
              </SectionIcon>
              <SectionTitle>Kontakty a podpora</SectionTitle>
            </SectionHeader>

            <ContactGrid>
              <TeamMember>
                <MemberHeader>
                  <MemberNameBlock>
                    <MemberName>IT hotline – nonstop</MemberName>
                    <MemberRole>Technická podpora 24/7</MemberRole>
                  </MemberNameBlock>
                  <MemberPhone>
                    <ContactIcon>
                      <FontAwesomeIcon icon={faPhone} />
                    </ContactIcon>
                    731 137 100
                  </MemberPhone>
                </MemberHeader>
                <MemberEmail>
                  <ContactIcon>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </ContactIcon>
                  helpdesk@zachranka.cz
                </MemberEmail>
              </TeamMember>

              <TeamMember>
                <MemberHeader>
                  <MemberNameBlock>
                    <MemberName>Tereza Bezoušková</MemberName>
                    <MemberRole>Ekonomie</MemberRole>
                  </MemberNameBlock>
                  <MemberPhone>
                    <ContactIcon>
                      <FontAwesomeIcon icon={faPhone} />
                    </ContactIcon>
                    734 673 568
                  </MemberPhone>
                </MemberHeader>
                <MemberEmail>
                  <ContactIcon>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </ContactIcon>
                  tereza.bezouskova@zachranka.cz
                </MemberEmail>
              </TeamMember>

              <TeamMember>
                <MemberHeader>
                  <MemberNameBlock>
                    <MemberName>Robert Holovský</MemberName>
                    <MemberRole>IT a programátor</MemberRole>
                  </MemberNameBlock>
                  <MemberPhone>
                    <ContactIcon>
                      <FontAwesomeIcon icon={faPhone} />
                    </ContactIcon>
                    731 137 077
                  </MemberPhone>
                </MemberHeader>
                <MemberEmail>
                  <ContactIcon>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </ContactIcon>
                  robert.holovsky@zachranka.cz
                </MemberEmail>
              </TeamMember>

              <TeamMember>
                <MemberHeader>
                  <MemberNameBlock>
                    <MemberName>Klára Šulgánová</MemberName>
                    <MemberRole>THP</MemberRole>
                  </MemberNameBlock>
                  <MemberPhone>
                    <ContactIcon>
                      <FontAwesomeIcon icon={faPhone} />
                    </ContactIcon>
                    Bude doplněn
                  </MemberPhone>
                </MemberHeader>
                <MemberEmail>
                  <ContactIcon>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </ContactIcon>
                  klara.sulganova@zachranka.cz
                </MemberEmail>
              </TeamMember>
            </ContactGrid>
          </Section>

          {/* Sekce Autoři */}
          <Section>
            <SectionHeader>
              <SectionIcon>
                <FontAwesomeIcon icon={faUsers} />
              </SectionIcon>
              <SectionTitle>Vývojový tým</SectionTitle>
            </SectionHeader>

            <TeamList style={{ textAlign: 'center' }}>
              <TeamMember style={{ background: 'transparent', boxShadow: 'none', padding: '0.75rem' }}>
                <MemberName style={{ fontSize: '1.25rem' }}>Tereza Bezoušková</MemberName>
                <MemberRole style={{ fontSize: '0.95rem', marginTop: '0.35rem' }}>Garant projektu</MemberRole>
              </TeamMember>

              <TeamMember style={{ background: 'transparent', boxShadow: 'none', padding: '0.75rem' }}>
                <MemberName style={{ fontSize: '1.25rem' }}>Robert Holovský</MemberName>
                <MemberRole style={{ fontSize: '0.95rem', marginTop: '0.35rem' }}>Programátor UIX, frontend a backend developer</MemberRole>
              </TeamMember>

              <TeamMember style={{ background: 'transparent', boxShadow: 'none', padding: '1rem 0.75rem 0.5rem' }}>
                <MemberRole style={{ fontSize: '1rem', fontWeight: '600', color: '#64748b', marginBottom: '0.75rem' }}>BETA testeři</MemberRole>
                <MemberName style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Klára Šulgánová</MemberName>
                <MemberName style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Hana Jonášová</MemberName>
                <MemberName style={{ fontSize: '1.1rem' }}>Hana Sochůrková</MemberName>
              </TeamMember>
            </TeamList>
          </Section>
        </Content>

        <Footer>
          <FooterText>
            Vytvořeno s
            <HeartIcon>
              <FontAwesomeIcon icon={faHeart} />
            </HeartIcon>
            pro Zdravotnickou záchrannou službu Středočeského kraje, příspěvková organizace
          </FooterText>
          <FooterText style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            © 2025–2026
          </FooterText>
        </Footer>
      </DialogContainer>
    </PageWrapper>
  );
};

export default About;
